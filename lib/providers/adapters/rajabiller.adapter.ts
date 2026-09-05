import crypto from 'crypto';
import type {
  GenericExecutionInput,
  GenericExecutionResult,
  GenericStatusCheckInput,
  GenericWebhookResult,
  IProviderAdapter,
  NormalizedExecutionStatus,
  ProviderCapabilities,
  RetryClassification,
} from '../types';

/**
 * Official RAJABILLER Provider Adapter for DaPay.
 *
 * Wire Protocol (based on official Rajabiller H2H JSON API specification):
 * - Production Endpoint: https://api.rajabiller.com/api_json.php
 * - Development / UAT Endpoint: https://c-dev-api.rajabiller.com/api_json.php
 * - Transport: HTTP POST application/json
 * - Authentication: { uid: string, pin: string } in JSON payload
 * - Methods:
 *     - Purchase: { method: "bayar", uid, pin, produk, idpel, ref1 }
 *     - Status Check: { method: "status", uid, pin, ref1, trxid }
 *     - Balance Inquiry: { method: "saldo", uid, pin }
 *     - Inquiry (Postpaid): { method: "cek", uid, pin, produk, idpel, ref1 }
 *
 * Critical Invariants:
 * - Upstream Correlation: Rajabiller produces its own transaction ID (trxid).
 *   The adapter surfaces this as `providerReference` to be persisted into `orders.provider_ref_id`.
 * - Game ID Format: Expects combined "user_id#zone_id" in `idpel`. Handled inside adapter only.
 * - Transport Safety: Network drops, timeouts, HTTP 5xx, or unreadable bodies map strictly
 *   to `transportOutcome: 'UNKNOWN'`, preventing waterfall duplicate-charge regressions.
 * - Unknown vendor rejections fail closed as `NON_RETRYABLE`.
 * - Postpaid capability: Marked `supportsPostpaid: false` until full inquiry bill schema
 *   is verified in merchant UAT sandbox.
 */
export class RajabillerAdapter implements IProviderAdapter {
  readonly providerCode = 'RAJABILLER';

  readonly capabilities: ProviderCapabilities = {
    supportsPrepaid: true,
    supportsPostpaid: false, // Documented: deferred until 2-step postpaid bill schema UAT
    supportsStatusCheck: true,
    supportsWebhook: true,
    supportsBalance: true,
  };

  private readonly defaultBaseUrl = 'https://api.rajabiller.com/api_json.php';

  /**
   * Retrieves base URL from environment or defaults to official production endpoint.
   */
  getBaseUrl(): string {
    return process.env.RAJABILLER_BASE_URL?.trim() || this.defaultBaseUrl;
  }

  /**
   * Checks whether RAJABILLER credentials (UID and PIN) are configured in server environment.
   */
  isConfigured(): boolean {
    const uid = process.env.RAJABILLER_UID?.trim();
    const pin = process.env.RAJABILLER_PIN?.trim();
    return Boolean(uid && pin);
  }

  /**
   * Retrieves server credentials or throws without leaking sensitive values.
   */
  private getCredentials(): { uid: string; pin: string; secretKey?: string } {
    const uid = process.env.RAJABILLER_UID?.trim() || '';
    const pin = process.env.RAJABILLER_PIN?.trim() || '';
    const secretKey = process.env.RAJABILLER_SECRET_KEY?.trim();

    if (!uid || !pin) {
      throw new Error('RAJABILLER credentials (RAJABILLER_UID, RAJABILLER_PIN) are missing from environment.');
    }

    return { uid, pin, secretKey };
  }

  /**
   * Formats customer destination for game topups.
   * Rajabiller standard: user_id#zone_id
   */
  formatDestination(input: GenericExecutionInput): string {
    if (input.destinationUserId && input.destinationZoneId) {
      return `${input.destinationUserId}#${input.destinationZoneId}`;
    }
    return input.destination;
  }

  /**
   * Classifies vendor rejection into RETRYABLE or NON_RETRYABLE.
   *
   * Fail-Safe Policy:
   * 1. Customer/destination errors -> NON_RETRYABLE (halts waterfall -> refunds user atomically)
   * 2. Operational/supplier balance/outage errors -> RETRYABLE (advances waterfall)
   * 3. Unknown / unclassified vendor rejection -> NON_RETRYABLE (halts waterfall fail-closed)
   */
  classifyFailure(message: string, rawCode?: string): RetryClassification {
    const code = String(rawCode || '').trim();
    const text = `${code} ${message || ''}`.toLowerCase();

    // Specific Rajabiller Response Codes
    // "06" = Saldo tidak cukup (Supplier balance failure -> RETRYABLE)
    if (code === '06' || text.includes('saldo tidak cukup') || text.includes('saldo minim')) {
      return 'RETRYABLE';
    }

    // "03" = ID Pelanggan tidak terdaftar (Customer terminal error -> NON_RETRYABLE)
    // "01" = PIN salah (Credentials error -> NON_RETRYABLE)
    // "97" = Duplikat transaksi (Terminal / duplicate -> NON_RETRYABLE)
    if (code === '03' || code === '01' || code === '97') {
      return 'NON_RETRYABLE';
    }

    // Customer Terminal Errors
    const isCustomerError =
      text.includes('id tidak ditemukan') ||
      text.includes('id pelanggan tidak terdaftar') ||
      text.includes('user id salah') ||
      text.includes('user id tidak valid') ||
      text.includes('zone id salah') ||
      text.includes('server id salah') ||
      text.includes('nomor tidak aktif') ||
      text.includes('nomor salah') ||
      text.includes('tujuan salah') ||
      text.includes('tujuan diblokir') ||
      text.includes('account banned') ||
      text.includes('format tujuan salah');

    if (isCustomerError) {
      return 'NON_RETRYABLE';
    }

    // Confidently identified supplier operational failures
    const isSupplierError =
      text.includes('gangguan') ||
      text.includes('server error') ||
      text.includes('supplier offline') ||
      text.includes('provider gangguan') ||
      text.includes('stok kosong') ||
      text.includes('stok habis') ||
      text.includes('cut off') ||
      text.includes('maintenance') ||
      text.includes('timeout') ||
      text.includes('biller offline');

    if (isSupplierError) {
      return 'RETRYABLE';
    }

    // Fail closed
    return 'NON_RETRYABLE';
  }

  /**
   * Normalizes vendor status to DaPay standard NormalizedExecutionStatus.
   */
  normalizeStatus(rawStatus?: string, message?: string, responseCode?: string): NormalizedExecutionStatus {
    const s = String(rawStatus || '').toLowerCase().trim();
    const m = String(message || '').toLowerCase().trim();
    const rc = String(responseCode || '').trim();

    if (rc === '00' || s === 'sukses' || s === 'success' || s === 'berhasil') {
      return 'SUCCESS';
    }

    if (s === 'pending' || s === 'waiting' || s === 'proses' || m.includes('pending') || m.includes('diproses')) {
      return 'PENDING';
    }

    if (s === 'gagal' || s === 'failed' || s === 'error' || rc && rc !== '00') {
      return 'FAILED';
    }

    return 'PENDING';
  }

  /**
   * Executes digital product purchase against RAJABILLER.
   * Method: bayar
   */
  async executeTransaction(input: GenericExecutionInput): Promise<GenericExecutionResult> {
    if (!this.isConfigured()) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'NOT_CONFIGURED',
        errorMessage: 'RAJABILLER credentials (UID/PIN) are not configured on the server.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
      };
    }

    const { uid, pin } = this.getCredentials();
    const baseUrl = this.getBaseUrl();
    const destination = this.formatDestination(input);

    const payload = {
      method: 'bayar',
      uid,
      pin,
      produk: input.vendorSku,
      idpel: destination,
      ref1: input.correlationRefId,
    };

    let response: Response;
    try {
      response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000), // Recommended 45-second timeout
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : 'Timeout during RAJABILLER execution';
      console.error('[RajabillerAdapter] Transport failure on executeTransaction:', msg);
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'NETWORK_TIMEOUT',
        errorMessage: `RAJABILLER transport error: ${msg}`,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    if (response.status >= 500) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: `HTTP_${response.status}`,
        errorMessage: `RAJABILLER server error: HTTP ${response.status} ${response.statusText}`,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const rawData = await response.json().catch(() => null) as {
      trxid?: string | number;
      id_transaksi?: string | number;
      rc?: string;
      status?: string;
      pesan?: string;
      message?: string;
      sn?: string;
      no_ref?: string;
      saldo_akhir?: string | number;
    } | null;

    if (!rawData) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'UNREADABLE_RESPONSE',
        errorMessage: 'RAJABILLER returned unreadable response body',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const trxId = rawData.trxid ? String(rawData.trxid) : (rawData.id_transaksi ? String(rawData.id_transaksi) : undefined);
    const rc = String(rawData.rc || '');
    const rawStatusStr = String(rawData.status || (rc === '00' ? 'Sukses' : 'Gagal'));
    const messageStr = String(rawData.pesan || rawData.message || rawStatusStr);
    const snStr = rawData.sn ? String(rawData.sn) : undefined;

    const normalizedStatus = this.normalizeStatus(rawStatusStr, messageStr, rc);

    let retryClassification: RetryClassification = 'NON_RETRYABLE';
    if (normalizedStatus === 'FAILED') {
      retryClassification = this.classifyFailure(messageStr, rc);
    }

    return {
      normalizedStatus,
      rawStatus: rawStatusStr,
      providerReference: trxId,
      serialNumber: snStr,
      retryClassification,
      errorCode: rc || undefined,
      errorMessage: normalizedStatus === 'FAILED' ? messageStr : undefined,
      transportOutcome: 'CONFIRMED_RESPONSE',
      rawResponse: rawData,
      metadata: {
        ...(rawData.no_ref ? { no_ref: rawData.no_ref } : {}),
        ...(rawData.saldo_akhir !== undefined ? { saldo_akhir: rawData.saldo_akhir } : {}),
      },
    };
  }

  /**
   * Queries transaction status from RAJABILLER.
   * Method: status
   */
  async checkStatus(input: GenericStatusCheckInput): Promise<GenericExecutionResult> {
    if (!this.isConfigured()) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'NOT_CONFIGURED',
        errorMessage: 'RAJABILLER credentials (UID/PIN) are not configured on the server.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
      };
    }

    const { uid, pin } = this.getCredentials();
    const baseUrl = this.getBaseUrl();

    const providerRef =
      (typeof input.additionalMetadata?.providerReference === 'string' && input.additionalMetadata.providerReference) ||
      (typeof input.additionalMetadata?.provider_ref_id === 'string' && input.additionalMetadata.provider_ref_id) ||
      (typeof input.additionalMetadata?.trxid === 'string' && input.additionalMetadata.trxid) ||
      undefined;

    const payload: Record<string, unknown> = {
      method: 'status',
      uid,
      pin,
      ref1: input.correlationRefId || input.orderId,
    };

    if (providerRef) {
      payload.trxid = providerRef;
    }

    let response: Response;
    try {
      response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : 'RAJABILLER status check timeout';
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'CHECK_STATUS_TIMEOUT',
        errorMessage: msg,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    if (response.status >= 500) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: `HTTP_${response.status}`,
        errorMessage: `RAJABILLER status check server error: HTTP ${response.status}`,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const rawData = await response.json().catch(() => null) as {
      trxid?: string | number;
      id_transaksi?: string | number;
      rc?: string;
      status?: string;
      pesan?: string;
      message?: string;
      sn?: string;
    } | null;

    if (!rawData) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'UNREADABLE_RESPONSE',
        errorMessage: 'RAJABILLER status check returned unreadable response body',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const trxId = rawData.trxid ? String(rawData.trxid) : (rawData.id_transaksi ? String(rawData.id_transaksi) : undefined);
    const rc = String(rawData.rc || '');
    const rawStatusStr = String(rawData.status || (rc === '00' ? 'Sukses' : ''));
    const messageStr = String(rawData.pesan || rawData.message || rawStatusStr);
    const snStr = rawData.sn ? String(rawData.sn) : undefined;

    const normalizedStatus = this.normalizeStatus(rawStatusStr, messageStr, rc);

    let retryClassification: RetryClassification = 'NON_RETRYABLE';
    if (normalizedStatus === 'FAILED') {
      retryClassification = this.classifyFailure(messageStr, rc);
    }

    return {
      normalizedStatus,
      rawStatus: rawStatusStr || (normalizedStatus === 'SUCCESS' ? 'Sukses' : 'Pending'),
      providerReference: trxId,
      serialNumber: snStr,
      retryClassification,
      errorCode: rc || undefined,
      errorMessage: normalizedStatus === 'FAILED' ? messageStr : undefined,
      transportOutcome: 'CONFIRMED_RESPONSE',
      rawResponse: rawData,
    };
  }

  /**
   * Validates incoming webhook/callback from RAJABILLER.
   */
  async parseWebhook(headers: Headers, rawBody: string): Promise<GenericWebhookResult> {
    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'Malformed RAJABILLER webhook JSON payload',
      };
    }

    if (!this.isConfigured()) {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'RAJABILLER is not configured on this server',
      };
    }

    const { secretKey } = this.getCredentials();

    // If secretKey is configured, verify signature header
    if (secretKey) {
      const receivedSig = headers.get('x-rajabiller-signature') || headers.get('x-signature');
      const expectedSig = crypto.createHash('sha256').update(`${secretKey}:${rawBody}`).digest('hex');

      if (!receivedSig || receivedSig.trim().toLowerCase() !== expectedSig.toLowerCase()) {
        return {
          isValid: false,
          orderId: '',
          rawRefId: '',
          normalizedStatus: 'FAILED',
          message: 'Invalid RAJABILLER webhook signature',
        };
      }
    }

    const rawRefId = String(payload.ref1 || payload.order_id || '');
    const cleanOrderId = rawRefId ? rawRefId.replace(/-R\d+$/, '') : '';
    const trxId = payload.trxid ? String(payload.trxid) : (payload.id_transaksi ? String(payload.id_transaksi) : undefined);
    const rc = String(payload.rc || '');
    const rawStatusStr = String(payload.status || (rc === '00' ? 'Sukses' : ''));
    const messageStr = String(payload.pesan || payload.message || rawStatusStr);
    const snStr = payload.sn ? String(payload.sn) : undefined;

    const normalizedStatus = this.normalizeStatus(rawStatusStr, messageStr, rc);

    return {
      isValid: true,
      orderId: cleanOrderId,
      rawRefId,
      normalizedStatus,
      providerReference: trxId,
      serialNumber: snStr,
      message: messageStr,
      rawPayload: payload,
    };
  }

  /**
   * Fetches current RAJABILLER merchant account balance.
   * Method: saldo
   */
  async getBalance(): Promise<number> {
    const { uid, pin } = this.getCredentials();
    const baseUrl = this.getBaseUrl();

    const payload = {
      method: 'saldo',
      uid,
      pin,
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`RAJABILLER getBalance HTTP error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as {
      saldo?: string | number;
      saldo_akhir?: string | number;
      data?: { saldo?: string | number };
    };

    const rawBalance = data?.saldo ?? data?.saldo_akhir ?? data?.data?.saldo;
    const balanceNum = Number(rawBalance);

    if (isNaN(balanceNum)) {
      throw new Error('RAJABILLER getBalance response missing valid numeric saldo data');
    }

    return balanceNum;
  }
}

