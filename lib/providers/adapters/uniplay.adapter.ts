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
 * Official UNIPLAY Provider Adapter for DaPay.
 *
 * Wire Protocol (based on official UniPlay Reseller API v1):
 * - Base URL: https://api-reseller.uniplay.id/v1 (configurable via UNIPLAY_BASE_URL)
 * - Security: HMAC-SHA512 signature in UPL-SIGNATURE header:
 *     hash_hmac('sha512', json_string, api_key + '|' + json_string)
 * - Token: POST /access-token generates single-use access token required in UPL-ACCESS-TOKEN header
 * - Inquiry DTU: POST /inquiry-dtu
 * - Inquiry Voucher: POST /inquiry-voucher
 * - Confirm Payment: POST /confirm-payment
 * - Check Order: POST /check-order
 * - Balance Inquiry: POST /inquiry-saldo
 *
 * Critical Invariants:
 * - Upstream Correlation: UNIPLAY generates its own provider transaction reference (trx_id).
 *   The adapter returns this as `providerReference` to be persisted into `orders.provider_ref_id`.
 * - Unknown Transport Safety: Timeouts, network dropouts, HTTP 5xx, or unreadable responses
 *   map strictly to `transportOutcome: 'UNKNOWN'`, preventing duplicate upstream charges.
 * - Unknown vendor rejections fail closed as `NON_RETRYABLE`.
 */
export class UniplayAdapter implements IProviderAdapter {
  readonly providerCode = 'UNIPLAY';

  readonly capabilities: ProviderCapabilities = {
    supportsPrepaid: true,
    supportsPostpaid: true,
    supportsStatusCheck: true,
    supportsWebhook: true,
    supportsBalance: true,
  };

  private readonly defaultBaseUrl = 'https://api-reseller.uniplay.id/v1';

  /**
   * Retrieves base URL from environment or defaults to official endpoint.
   */
  getBaseUrl(): string {
    return process.env.UNIPLAY_BASE_URL?.trim() || this.defaultBaseUrl;
  }

  /**
   * Checks whether UNIPLAY credentials are configured in server environment.
   */
  isConfigured(): boolean {
    const apiKey = process.env.UNIPLAY_API_KEY?.trim();
    return Boolean(apiKey);
  }

  /**
   * Retrieves server credentials or throws without leaking sensitive values.
   */
  private getCredentials(): { apiKey: string } {
    const apiKey = process.env.UNIPLAY_API_KEY?.trim() || '';
    if (!apiKey) {
      throw new Error('UNIPLAY credentials (UNIPLAY_API_KEY) are missing from environment.');
    }
    return { apiKey };
  }

  /**
   * Generates formatted timestamp in "YYYY-MM-DD HH:mm:ss" UTC format.
   */
  formatTimestamp(date: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    const seconds = pad(date.getUTCSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Generates HMAC-SHA512 signature for UniPlay requests.
   * Formula: hash_hmac('sha512', json_string, api_key + '|' + json_string)
   */
  generateSignature(apiKey: string, timestamp: string): string {
    const jsonString = JSON.stringify({ api_key: apiKey, timestamp });
    const hmacKey = `${apiKey}|${jsonString}`;
    return crypto.createHmac('sha512', hmacKey).update(jsonString).digest('hex');
  }

  /**
   * Requests a one-time access token from UniPlay.
   * Endpoint: POST /access-token
   */
  async requestAccessToken(apiKey: string, baseUrl: string): Promise<{ token?: string; errorOutcome?: GenericExecutionResult }> {
    const timestamp = this.formatTimestamp();
    const signature = this.generateSignature(apiKey, timestamp);

    const payload = {
      api_key: apiKey,
      timestamp,
    };

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/access-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'UPL-SIGNATURE': signature,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : 'Timeout requesting UNIPLAY access token';
      return {
        errorOutcome: {
          normalizedStatus: 'PENDING',
          rawStatus: 'TOKEN_NETWORK_TIMEOUT',
          errorMessage: `UNIPLAY token transport error: ${msg}`,
          retryClassification: 'NON_RETRYABLE',
          transportOutcome: 'UNKNOWN',
        },
      };
    }

    if (response.status >= 500) {
      return {
        errorOutcome: {
          normalizedStatus: 'PENDING',
          rawStatus: `HTTP_${response.status}`,
          errorMessage: `UNIPLAY token server error: HTTP ${response.status}`,
          retryClassification: 'NON_RETRYABLE',
          transportOutcome: 'UNKNOWN',
        },
      };
    }

    const rawData = await response.json().catch(() => null) as {
      response_code?: number | string;
      response_message?: string;
      data?: { access_token?: string };
    } | null;

    if (!rawData) {
      return {
        errorOutcome: {
          normalizedStatus: 'PENDING',
          rawStatus: 'UNREADABLE_TOKEN_RESPONSE',
          errorMessage: 'UNIPLAY returned unreadable body on access token request',
          retryClassification: 'NON_RETRYABLE',
          transportOutcome: 'UNKNOWN',
        },
      };
    }

    const code = Number(rawData.response_code);
    const token = rawData.data?.access_token;

    if (code !== 200 || !token) {
      const retryClassification = this.classifyFailure(rawData.response_message || '', String(code));
      return {
        errorOutcome: {
          normalizedStatus: 'FAILED',
          rawStatus: `TOKEN_ERROR_${code}`,
          errorMessage: rawData.response_message || `UNIPLAY access token rejected with code ${code}`,
          retryClassification,
          transportOutcome: 'CONFIRMED_RESPONSE',
          rawResponse: rawData,
        },
      };
    }

    return { token };
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

    // Specific UniPlay Response Codes
    if (code === '1000') {
      // UniPlay Point Balance Not Enough -> Supplier balance failure (RETRYABLE to next provider)
      return 'RETRYABLE';
    }

    // Customer Terminal Errors (NON_RETRYABLE)
    const isCustomerError =
      text.includes('id tidak ditemukan') ||
      text.includes('user id salah') ||
      text.includes('user id tidak valid') ||
      text.includes('id salah') ||
      text.includes('zone id salah') ||
      text.includes('server id salah') ||
      text.includes('server tidak sesuai') ||
      text.includes('tujuan diblokir') ||
      text.includes('account banned') ||
      text.includes('nomor tidak aktif') ||
      text.includes('nomor salah') ||
      text.includes('invalid user') ||
      text.includes('invalid destination') ||
      text.includes('inquiry not found') ||
      code === '800';

    if (isCustomerError) {
      return 'NON_RETRYABLE';
    }

    // Confidently identified supplier operational failures (RETRYABLE)
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
      text.includes('balance not enough') ||
      text.includes('insufficient point');

    if (isSupplierError) {
      return 'RETRYABLE';
    }

    // Fail closed
    return 'NON_RETRYABLE';
  }

  /**
   * Normalizes vendor status to DaPay standard NormalizedExecutionStatus.
   */
  normalizeStatus(rawStatus?: string, message?: string, responseCode?: number | string): NormalizedExecutionStatus {
    const s = String(rawStatus || '').toUpperCase().trim();
    const m = String(message || '').toLowerCase().trim();
    const code = Number(responseCode);

    if (s === 'SUCCESS' || s === 'SUKSES' || s === 'BERHASIL' || code === 200 && m.includes('sukses')) {
      return 'SUCCESS';
    }

    if (s === 'PENDING' || s === 'WAITING' || s === 'PROCESSING' || s === 'PROSES' || m.includes('diproses') || m.includes('waiting')) {
      return 'PENDING';
    }

    if (s === 'FAILED' || s === 'GAGAL' || s === 'ERROR' || code > 200 && code !== 0) {
      return 'FAILED';
    }

    return 'PENDING';
  }

  /**
   * Executes digital product purchase against UNIPLAY.
   * Performs:
   * 1. Access Token acquisition
   * 2. Inquiry (inquiry-dtu or inquiry-voucher)
   * 3. Confirm Payment (confirm-payment)
   */
  async executeTransaction(input: GenericExecutionInput): Promise<GenericExecutionResult> {
    if (!this.isConfigured()) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'NOT_CONFIGURED',
        errorMessage: 'UNIPLAY credentials are not configured on the server.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
      };
    }

    const { apiKey } = this.getCredentials();
    const baseUrl = this.getBaseUrl();

    // 1. Acquire Access Token for Inquiry
    const { token: token1, errorOutcome: tokenErr1 } = await this.requestAccessToken(apiKey, baseUrl);
    if (tokenErr1 || !token1) {
      return tokenErr1 || {
        normalizedStatus: 'FAILED',
        rawStatus: 'TOKEN_ACQUISITION_FAILED',
        errorMessage: 'Failed to acquire initial UNIPLAY access token',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
      };
    }

    // 2. Perform Inquiry Step
    const isVoucher = Boolean(input.category && input.category.toLowerCase().includes('voucher'));
    const inquiryEndpoint = isVoucher ? `${baseUrl}/inquiry-voucher` : `${baseUrl}/inquiry-dtu`;

    const timestampInquiry = this.formatTimestamp();
    const signatureInquiry = this.generateSignature(apiKey, timestampInquiry);

    const inquiryPayload: Record<string, unknown> = {
      api_key: apiKey,
      sku: input.vendorSku,
      user_id: input.destinationUserId || input.destination,
      zone_id: input.destinationZoneId || '',
      order_id: input.correlationRefId,
      timestamp: timestampInquiry,
    };

    let inquiryResponse: Response;
    try {
      inquiryResponse = await fetch(inquiryEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'UPL-SIGNATURE': signatureInquiry,
          'UPL-ACCESS-TOKEN': token1,
        },
        body: JSON.stringify(inquiryPayload),
        signal: AbortSignal.timeout(30000),
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : 'Timeout during UNIPLAY inquiry';
      console.error('[UniplayAdapter] Transport failure on inquiry:', msg);
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'INQUIRY_TIMEOUT',
        errorMessage: `UNIPLAY inquiry transport error: ${msg}`,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    if (inquiryResponse.status >= 500) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: `HTTP_${inquiryResponse.status}`,
        errorMessage: `UNIPLAY inquiry server error: HTTP ${inquiryResponse.status}`,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const inquiryData = await inquiryResponse.json().catch(() => null) as {
      response_code?: number | string;
      response_message?: string;
      data?: { inquiry_id?: string; trx_id?: string; status?: string; user_name?: string };
    } | null;

    if (!inquiryData) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'UNREADABLE_INQUIRY_RESPONSE',
        errorMessage: 'UNIPLAY returned unreadable body on inquiry',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const inquiryCode = Number(inquiryData.response_code);
    if (inquiryCode !== 200 || !inquiryData.data) {
      const retryClassification = this.classifyFailure(inquiryData.response_message || '', String(inquiryCode));
      return {
        normalizedStatus: 'FAILED',
        rawStatus: `INQUIRY_FAILED_${inquiryCode}`,
        errorMessage: inquiryData.response_message || `Inquiry failed with code ${inquiryCode}`,
        retryClassification,
        transportOutcome: 'CONFIRMED_RESPONSE',
        rawResponse: inquiryData,
      };
    }

    const inqId = inquiryData.data.inquiry_id || inquiryData.data.trx_id;

    // 3. Acquire Second Access Token for Confirmation (tokens are one-time use)
    const { token: token2, errorOutcome: tokenErr2 } = await this.requestAccessToken(apiKey, baseUrl);
    if (tokenErr2 || !token2) {
      return tokenErr2 || {
        normalizedStatus: 'FAILED',
        rawStatus: 'CONFIRM_TOKEN_FAILED',
        errorMessage: 'Failed to acquire confirmation access token from UNIPLAY',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
      };
    }

    // 4. Perform Confirmation Step
    const timestampConfirm = this.formatTimestamp();
    const signatureConfirm = this.generateSignature(apiKey, timestampConfirm);

    const confirmPayload: Record<string, unknown> = {
      api_key: apiKey,
      inquiry_id: inqId,
      order_id: input.correlationRefId,
      timestamp: timestampConfirm,
    };

    let confirmResponse: Response;
    try {
      confirmResponse = await fetch(`${baseUrl}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'UPL-SIGNATURE': signatureConfirm,
          'UPL-ACCESS-TOKEN': token2,
        },
        body: JSON.stringify(confirmPayload),
        signal: AbortSignal.timeout(45000),
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : 'Timeout during UNIPLAY confirm-payment';
      console.error('[UniplayAdapter] Transport failure on confirm-payment:', msg);
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'CONFIRM_TIMEOUT',
        errorMessage: `UNIPLAY confirmation transport error: ${msg}`,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    if (confirmResponse.status >= 500) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: `HTTP_${confirmResponse.status}`,
        errorMessage: `UNIPLAY confirmation server error: HTTP ${confirmResponse.status}`,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const confirmData = await confirmResponse.json().catch(() => null) as {
      response_code?: number | string;
      response_message?: string;
      data?: {
        trx_id?: string;
        order_id?: string;
        status?: string;
        sn?: string;
        serial_number?: string;
        note?: string;
      };
    } | null;

    if (!confirmData) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'UNREADABLE_CONFIRM_RESPONSE',
        errorMessage: 'UNIPLAY returned unreadable body on confirmation',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const confirmCode = Number(confirmData.response_code);
    const d = confirmData.data || {};
    const trxId = d.trx_id ? String(d.trx_id) : undefined;
    const rawStatusStr = String(d.status || (confirmCode === 200 ? 'SUCCESS' : 'FAILED'));
    const messageStr = String(confirmData.response_message || d.note || '');
    const snStr = d.sn || d.serial_number || d.note;

    if (confirmCode !== 200 && confirmCode !== 0) {
      const retryClassification = this.classifyFailure(messageStr, String(confirmCode));
      return {
        normalizedStatus: 'FAILED',
        rawStatus: `CONFIRM_FAILED_${confirmCode}`,
        providerReference: trxId,
        errorMessage: messageStr || `Confirmation failed with code ${confirmCode}`,
        retryClassification,
        transportOutcome: 'CONFIRMED_RESPONSE',
        rawResponse: confirmData,
      };
    }

    const normalizedStatus = this.normalizeStatus(rawStatusStr, messageStr, confirmCode);

    let retryClassification: RetryClassification = 'NON_RETRYABLE';
    if (normalizedStatus === 'FAILED') {
      retryClassification = this.classifyFailure(messageStr, String(confirmCode));
    }

    return {
      normalizedStatus,
      rawStatus: rawStatusStr,
      providerReference: trxId,
      serialNumber: snStr,
      retryClassification,
      errorMessage: normalizedStatus === 'FAILED' ? messageStr : undefined,
      transportOutcome: 'CONFIRMED_RESPONSE',
      rawResponse: confirmData,
      metadata: {
        ...(inquiryData.data?.user_name ? { user_name: inquiryData.data.user_name } : {}),
      },
    };
  }

  /**
   * Queries transaction status from UNIPLAY.
   * Endpoint: POST /check-order
   */
  async checkStatus(input: GenericStatusCheckInput): Promise<GenericExecutionResult> {
    if (!this.isConfigured()) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'NOT_CONFIGURED',
        errorMessage: 'UNIPLAY credentials are not configured on the server.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
      };
    }

    const { apiKey } = this.getCredentials();
    const baseUrl = this.getBaseUrl();

    const { token, errorOutcome: tokenErr } = await this.requestAccessToken(apiKey, baseUrl);
    if (tokenErr || !token) {
      return tokenErr || {
        normalizedStatus: 'FAILED',
        rawStatus: 'TOKEN_ACQUISITION_FAILED',
        errorMessage: 'Failed to acquire access token for UNIPLAY status check',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
      };
    }

    const timestamp = this.formatTimestamp();
    const signature = this.generateSignature(apiKey, timestamp);

    const targetRef =
      (typeof input.additionalMetadata?.providerReference === 'string' && input.additionalMetadata.providerReference) ||
      (typeof input.additionalMetadata?.provider_ref_id === 'string' && input.additionalMetadata.provider_ref_id) ||
      input.correlationRefId ||
      input.orderId;

    const payload = {
      api_key: apiKey,
      order_id: input.correlationRefId || input.orderId,
      trx_id: targetRef,
      timestamp,
    };

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/check-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'UPL-SIGNATURE': signature,
          'UPL-ACCESS-TOKEN': token,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : 'UNIPLAY checkStatus timeout';
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
        errorMessage: `UNIPLAY checkStatus server error: HTTP ${response.status}`,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const rawData = await response.json().catch(() => null) as {
      response_code?: number | string;
      response_message?: string;
      data?: {
        trx_id?: string;
        order_id?: string;
        status?: string;
        sn?: string;
        serial_number?: string;
      };
    } | null;

    if (!rawData) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'UNREADABLE_STATUS_RESPONSE',
        errorMessage: 'UNIPLAY checkStatus returned unreadable response',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const code = Number(rawData.response_code);
    const d = rawData.data || {};
    const trxId = d.trx_id ? String(d.trx_id) : undefined;
    const rawStatusStr = String(d.status || '');
    const messageStr = String(rawData.response_message || '');
    const snStr = d.sn || d.serial_number;

    const normalizedStatus = this.normalizeStatus(rawStatusStr, messageStr, code);

    let retryClassification: RetryClassification = 'NON_RETRYABLE';
    if (normalizedStatus === 'FAILED') {
      retryClassification = this.classifyFailure(messageStr, String(code));
    }

    return {
      normalizedStatus,
      rawStatus: rawStatusStr || (normalizedStatus === 'SUCCESS' ? 'SUCCESS' : 'PENDING'),
      providerReference: trxId,
      serialNumber: snStr,
      retryClassification,
      errorMessage: normalizedStatus === 'FAILED' ? messageStr : undefined,
      transportOutcome: 'CONFIRMED_RESPONSE',
      rawResponse: rawData,
    };
  }

  /**
   * Validates incoming webhook from UNIPLAY.
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
        message: 'Malformed UNIPLAY webhook JSON payload',
      };
    }

    if (!this.isConfigured()) {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'UNIPLAY is not configured on this server',
      };
    }

    const { apiKey } = this.getCredentials();

    // Verify signature header
    const receivedSignature =
      headers.get('upl-signature') ||
      headers.get('x-uniplay-signature') ||
      (typeof payload.signature === 'string' ? payload.signature : undefined);

    const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp : '';
    const expectedSignature = this.generateSignature(apiKey, timestamp);

    if (!receivedSignature || receivedSignature.trim().toLowerCase() !== expectedSignature.toLowerCase()) {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'Invalid UNIPLAY webhook signature',
      };
    }

    const rawRefId = String(payload.order_id || payload.ref_id || '');
    const cleanOrderId = rawRefId ? rawRefId.replace(/-R\d+$/, '') : '';
    const trxId = payload.trx_id ? String(payload.trx_id) : undefined;
    const rawStatusStr = String(payload.status || '');
    const messageStr = String(payload.message || payload.note || '');
    const snStr = payload.sn ? String(payload.sn) : (payload.serial_number ? String(payload.serial_number) : undefined);

    const normalizedStatus = this.normalizeStatus(rawStatusStr, messageStr);

    return {
      isValid: true,
      orderId: cleanOrderId,
      rawRefId,
      normalizedStatus,
      providerReference: trxId,
      serialNumber: snStr,
      message: messageStr || rawStatusStr,
      rawPayload: payload,
    };
  }

  /**
   * Fetches current UNIPLAY merchant account balance.
   * Endpoint: POST /inquiry-saldo
   */
  async getBalance(): Promise<number> {
    const { apiKey } = this.getCredentials();
    const baseUrl = this.getBaseUrl();

    const { token, errorOutcome: tokenErr } = await this.requestAccessToken(apiKey, baseUrl);
    if (tokenErr || !token) {
      throw new Error(`UNIPLAY getBalance token error: ${tokenErr?.errorMessage || 'Could not acquire token'}`);
    }

    const timestamp = this.formatTimestamp();
    const signature = this.generateSignature(apiKey, timestamp);

    const payload = {
      api_key: apiKey,
      timestamp,
    };

    const res = await fetch(`${baseUrl}/inquiry-saldo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'UPL-SIGNATURE': signature,
        'UPL-ACCESS-TOKEN': token,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`UNIPLAY getBalance HTTP error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as {
      response_code?: number | string;
      data?: { point?: number | string; balance?: number | string; saldo?: number | string };
    };

    const d = data?.data;
    const balanceNum = Number(d?.point ?? d?.balance ?? d?.saldo);

    if (isNaN(balanceNum)) {
      throw new Error('UNIPLAY getBalance response missing valid numeric point/balance data');
    }

    return balanceNum;
  }
}

