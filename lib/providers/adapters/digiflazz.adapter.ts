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
 * Official Digiflazz Provider Adapter for DaPay.
 *
 * Encapsulates all Digiflazz-specific protocols:
 * - MD5 signature calculation: MD5(username + apiKey + refId)
 * - Prepaid & Postpaid API endpoints at https://api.digiflazz.com/v1
 * - Response status normalization: Sukses -> SUCCESS, Pending -> PENDING, Gagal -> FAILED
 * - Failure retry classification (transient/stock vs terminal customer error)
 * - Safe transport outcome classification: Network timeouts are classified as UNKNOWN (anti-double charge)
 * - Webhook payload parsing & X-Digiflazz-Delivery HMAC/MD5 verification
 * - Live balance inquiry: https://api.digiflazz.com/v1/cek-saldo
 */
export class DigiflazzAdapter implements IProviderAdapter {
  readonly providerCode = 'DIGIFLAZZ';

  readonly capabilities: ProviderCapabilities = {
    supportsPrepaid: true,
    supportsPostpaid: true,
    supportsStatusCheck: true,
    supportsWebhook: true,
    supportsBalance: true,
  };

  private readonly baseUrl = 'https://api.digiflazz.com/v1';

  /**
   * Checks whether Digiflazz credentials are configured in server environment.
   */
  isConfigured(): boolean {
    const username = process.env.DIGIFLAZZ_USERNAME?.trim();
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim();
    return Boolean(username && apiKey);
  }

  private getCredentials(): { username: string; apiKey: string } {
    const username = process.env.DIGIFLAZZ_USERNAME?.trim() || '';
    const apiKey = process.env.DIGIFLAZZ_API_KEY?.trim() || '';
    if (!username || !apiKey) {
      throw new Error('Digiflazz credentials (DIGIFLAZZ_USERNAME, DIGIFLAZZ_API_KEY) are missing from environment.');
    }
    return { username, apiKey };
  }

  /**
   * Generates MD5 signature for transaction / status-check requests.
   * Formula: MD5(username + apiKey + refId)
   */
  generateTransactionSignature(username: string, apiKey: string, refId: string): string {
    return crypto.createHash('md5').update(username + apiKey + refId).digest('hex');
  }

  /**
   * Generates MD5 signature for balance inquiry requests.
   * Formula: MD5(username + apiKey + "depo")
   */
  generateBalanceSignature(username: string, apiKey: string): string {
    return crypto.createHash('md5').update(username + apiKey + 'depo').digest('hex');
  }

  /**
   * Classifies a definitive Digiflazz failure response into RETRYABLE or NON_RETRYABLE.
   * - Terminal customer errors (invalid phone/id, bill already paid) -> NON_RETRYABLE
   * - Supplier/vendor errors (out of stock, maintenance, cut off) -> RETRYABLE
   */
  classifyFailure(message: string, rc?: string): RetryClassification {
    const lower = (message || '').toLowerCase();
    const isCustomerError =
      lower.includes('tujuan salah') ||
      lower.includes('nomor salah') ||
      lower.includes('id pelanggan salah') ||
      lower.includes('nomor tidak terdaftar') ||
      lower.includes('tagihan sudah terbayar') ||
      lower.includes('tagihan lunas') ||
      lower.includes('nomor tujuan diblokir') ||
      lower.includes('id salah') ||
      rc === '01' || // Kelebihan Digit / Format Salah
      rc === '02';   // Nomor Tujuan Salah

    if (isCustomerError) {
      return 'NON_RETRYABLE';
    }

    // Default for vendor-side rejections (stok habis, produk gangguan, cut off, dll) is retryable
    return 'RETRYABLE';
  }

  /**
   * Executes a prepaid or postpaid purchase against Digiflazz.
   * Endpoint: POST https://api.digiflazz.com/v1/transaction
   */
  async executeTransaction(input: GenericExecutionInput): Promise<GenericExecutionResult> {
    if (!this.isConfigured()) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'NOT_CONFIGURED',
        errorMessage: 'Digiflazz credentials are not configured on the server.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
      };
    }

    const { username, apiKey } = this.getCredentials();
    const sign = this.generateTransactionSignature(username, apiKey, input.correlationRefId);

    const categoryLower = (input.category || '').toLowerCase();
    const isPostpaid = categoryLower.includes('pascabayar') || categoryLower.includes('pln pasca');

    // Clean destination for postpaid if formatted with parens: e.g. "123456(2022)" -> "123456"
    const targetCustomerNo = isPostpaid
      ? input.destination.split('(')[0].trim()
      : input.destination;

    const payload: Record<string, unknown> = {
      username,
      buyer_sku_code: isPostpaid ? input.vendorSku.toUpperCase() : input.vendorSku,
      customer_no: targetCustomerNo,
      ref_id: input.correlationRefId,
      sign,
    };

    if (isPostpaid) {
      payload.commands = 'pay-pasca';
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000), // 45-second timeout as established in production
      });
    } catch (networkErr: unknown) {
      // Network timeout / connection reset occurred AFTER request may have been transmitted
      const message = networkErr instanceof Error ? networkErr.message : 'Digiflazz network connection timeout';
      console.error('[DigiflazzAdapter] Transport failure on executeTransaction:', message);

      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'NETWORK_TIMEOUT',
        errorMessage: `Digiflazz transport error: ${message}`,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    let rawData: unknown;
    try {
      rawData = await response.json();
    } catch {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'UNREADABLE_RESPONSE',
        errorMessage: 'Digiflazz returned an unreadable response body.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const parsed = rawData as { data?: Record<string, unknown> };
    const d = parsed?.data;

    if (!d) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'EMPTY_DATA',
        errorMessage: 'Digiflazz response payload did not contain data object.',
        retryClassification: 'RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
        rawResponse: rawData,
      };
    }

    const statusStr = String(d.status || '');
    const message = String(d.message || '');
    const rc = d.rc ? String(d.rc) : undefined;
    const sn = d.sn ? String(d.sn) : undefined;
    const refId = d.ref_id ? String(d.ref_id) : undefined;

    let normalizedStatus: NormalizedExecutionStatus;
    let retryClassification: RetryClassification;

    if (statusStr === 'Sukses') {
      normalizedStatus = 'SUCCESS';
      retryClassification = 'NON_RETRYABLE';
    } else if (statusStr === 'Pending') {
      normalizedStatus = 'PENDING';
      retryClassification = 'NON_RETRYABLE';
    } else {
      normalizedStatus = 'FAILED';
      retryClassification = this.classifyFailure(message, rc);
    }

    // Build normalized metadata carrying provider response details (postpaid / PLN / meter)
    let metadata: Record<string, unknown> | undefined;
    const descObj = typeof d.desc === 'object' && d.desc !== null ? (d.desc as Record<string, unknown>) : undefined;

    if (descObj || d.customer_name || d.price !== undefined) {
      metadata = {
        ...(descObj ? { desc: descObj } : {}),
      };

      const customerName = typeof d.customer_name === 'string' && d.customer_name
        ? d.customer_name
        : typeof descObj?.nama === 'string' && descObj.nama
        ? descObj.nama
        : typeof descObj?.nama_pelanggan === 'string' && descObj.nama_pelanggan
        ? descObj.nama_pelanggan
        : undefined;
      if (customerName) {
        metadata.customer_name = customerName;
      }

      if (typeof d.price === 'number') {
        metadata.raw_tagihan = d.price;
      }

      const tarif = typeof descObj?.tarif === 'string' ? descObj.tarif : '';
      const daya = typeof descObj?.daya === 'string' ? descObj.daya : '';
      if (tarif) metadata.tarif = tarif;
      if (daya) metadata.daya = daya;
      if (tarif || daya) {
        metadata.segment_power = `${tarif}${daya ? '/' + daya : ''}`;
      }

      const descTagihan = descObj?.tagihan as { detail?: Array<{ meter_awal?: unknown; meter_akhir?: unknown }> } | undefined;
      const descDetailList = descObj?.detail as Array<{ meter_awal?: unknown; meter_akhir?: unknown }> | undefined;
      const detailItem = descDetailList?.[0] || descTagihan?.detail?.[0];

      if (detailItem?.meter_awal && detailItem?.meter_akhir) {
        metadata.stand_meter = `${detailItem.meter_awal} - ${detailItem.meter_akhir}`;
      } else if (descObj?.stand_meter) {
        metadata.stand_meter = String(descObj.stand_meter);
      }
    }

    return {
      normalizedStatus,
      rawStatus: statusStr,
      providerReference: refId,
      serialNumber: sn,
      retryClassification,
      errorCode: rc,
      errorMessage: message,
      transportOutcome: 'CONFIRMED_RESPONSE',
      rawResponse: rawData,
      metadata,
    };
  }

  /**
   * Queries transaction status from Digiflazz.
   * Endpoint: POST https://api.digiflazz.com/v1/transaction
   */
  async checkStatus(input: GenericStatusCheckInput): Promise<GenericExecutionResult> {
    if (!this.isConfigured()) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'NOT_CONFIGURED',
        errorMessage: 'Digiflazz credentials are not configured on the server.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
      };
    }

    const { username, apiKey } = this.getCredentials();
    const sign = this.generateTransactionSignature(username, apiKey, input.correlationRefId);

    const payload: Record<string, unknown> = {
      username,
      buyer_sku_code: input.vendorSku,
      customer_no: input.destination,
      ref_id: input.correlationRefId,
      sign,
    };

    if (input.additionalMetadata?.commands === 'status-pasca') {
      payload.commands = 'status-pasca';
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
    } catch (networkErr: unknown) {
      const message = networkErr instanceof Error ? networkErr.message : 'Check-status timeout';
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'STATUS_CHECK_TIMEOUT',
        errorMessage: message,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const rawData = await response.json().catch(() => null);
    const parsed = rawData as { data?: Record<string, unknown> };
    const d = parsed?.data;

    if (!d) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'EMPTY_DATA',
        errorMessage: 'Digiflazz status check did not return data.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
        rawResponse: rawData,
      };
    }

    const statusStr = String(d.status || '');
    const message = String(d.message || '');
    const rc = d.rc ? String(d.rc) : undefined;
    const sn = d.sn ? String(d.sn) : undefined;
    const refId = d.ref_id ? String(d.ref_id) : undefined;

    let normalizedStatus: NormalizedExecutionStatus;
    let retryClassification: RetryClassification;

    if (statusStr === 'Sukses') {
      normalizedStatus = 'SUCCESS';
      retryClassification = 'NON_RETRYABLE';
    } else if (statusStr === 'Pending') {
      normalizedStatus = 'PENDING';
      retryClassification = 'NON_RETRYABLE';
    } else {
      normalizedStatus = 'FAILED';
      retryClassification = this.classifyFailure(message, rc);
    }

    return {
      normalizedStatus,
      rawStatus: statusStr,
      providerReference: refId,
      serialNumber: sn,
      retryClassification,
      errorCode: rc,
      errorMessage: message,
      transportOutcome: 'CONFIRMED_RESPONSE',
      rawResponse: rawData,
      metadata: typeof d.desc === 'object' && d.desc !== null ? (d.desc as Record<string, unknown>) : undefined,
    };
  }

  /**
   * Validates and normalizes incoming Digiflazz webhook callback.
   * Header: X-Digiflazz-Delivery
   * Signature: MD5(username + apiKey + rawBody)
   */
  async parseWebhook(headers: Headers, rawBody: string): Promise<GenericWebhookResult> {
    const signature = headers.get('X-Digiflazz-Delivery') || headers.get('x-digiflazz-delivery');
    if (!signature) {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'Missing X-Digiflazz-Delivery header',
      };
    }

    let username = '';
    let apiKey = '';
    try {
      const creds = this.getCredentials();
      username = creds.username;
      apiKey = creds.apiKey;
    } catch {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'Server Digiflazz credentials unconfigured',
      };
    }

    const expectedSignature = crypto.createHash('md5').update(username + apiKey + rawBody).digest('hex');
    if (signature !== expectedSignature) {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'Invalid webhook signature',
      };
    }

    let body: { data?: Record<string, unknown> };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'Invalid webhook JSON body',
      };
    }

    const eventData = body?.data;
    if (!eventData) {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'Webhook body missing data object',
      };
    }

    const rawRefId = String(eventData.ref_id || '');
    const cleanOrderId = rawRefId.replace(/-R\d+$/, '');
    const statusStr = String(eventData.status || '');
    const sn = eventData.sn ? String(eventData.sn) : undefined;
    const message = eventData.message ? String(eventData.message) : undefined;

    let normalizedStatus: NormalizedExecutionStatus;
    if (statusStr === 'Sukses') {
      normalizedStatus = 'SUCCESS';
    } else if (statusStr === 'Pending') {
      normalizedStatus = 'PENDING';
    } else {
      normalizedStatus = 'FAILED';
    }

    return {
      isValid: true,
      orderId: cleanOrderId,
      rawRefId,
      normalizedStatus,
      serialNumber: sn,
      message,
      rawPayload: body,
      metadata: typeof eventData.desc === 'object' && eventData.desc !== null
        ? (eventData.desc as Record<string, unknown>)
        : undefined,
    };
  }

  /**
   * Fetches current Digiflazz deposit balance.
   * Endpoint: POST https://api.digiflazz.com/v1/cek-saldo
   * Body: { cmd: "deposit", username, sign: MD5(username + apiKey + "depo") }
   */
  async getBalance(): Promise<number> {
    const { username, apiKey } = this.getCredentials();
    const sign = this.generateBalanceSignature(username, apiKey);

    const res = await fetch(`${this.baseUrl}/cek-saldo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: 'deposit', username, sign }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Digiflazz getBalance HTTP error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const deposit = Number(data?.data?.deposit);
    if (isNaN(deposit)) {
      throw new Error('Digiflazz getBalance response did not contain numeric deposit value.');
    }

    return deposit;
  }
}
