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
 * Official VIP_RESELLER (VIPayment) Provider Adapter for DaPay.
 *
 * Implements IProviderAdapter strictly according to VIPayment wire protocol:
 * - Prepaid Orders: POST https://vip-reseller.co.id/api/prepaid
 * - Game Feature Orders: POST https://vip-reseller.co.id/api/game-feature
 * - Postpaid Orders: POST https://vip-reseller.co.id/api/postpaid
 * - Status Check: POST https://vip-reseller.co.id/api/prepaid (type: 'status', trxid)
 * - Profile / Balance: POST https://vip-reseller.co.id/api/profile
 * - Webhook / Callback: POST with X-Client-Signature / sign: md5(api_id + api_key)
 *
 * Critical Invariants:
 * - Correlation: VIP_RESELLER generates its own provider transaction reference (`trxid`).
 *   The adapter surfaces this as `providerReference` so DaPay engine/reconciliation can
 *   persist and query `orders.provider_ref_id`.
 * - Webhooks omitting client order_id are parsed with empty orderId, enabling fallback
 *   lookup by `(provider_used, provider_ref_id)`.
 * - Unknown vendor rejections fail closed as `NON_RETRYABLE` (never trigger accidental waterfall).
 * - Timeouts, connection drops, HTTP 5xx, and unreadable responses map to `transportOutcome: 'UNKNOWN'`.
 */
export class VipResellerAdapter implements IProviderAdapter {
  readonly providerCode = 'VIP_RESELLER';

  readonly capabilities: ProviderCapabilities = {
    supportsPrepaid: true,
    supportsPostpaid: true,
    supportsStatusCheck: true,
    supportsWebhook: true,
    supportsBalance: true,
  };

  private readonly defaultBaseUrl = 'https://vip-reseller.co.id/api';

  /**
   * Retrieves the base URL from environment or defaults to the production endpoint.
   */
  getBaseUrl(): string {
    return process.env.VIP_RESELLER_BASE_URL?.trim() || this.defaultBaseUrl;
  }

  /**
   * Checks whether VIP_RESELLER credentials are configured in server environment.
   */
  isConfigured(): boolean {
    const apiId = process.env.VIP_RESELLER_API_ID?.trim();
    const apiKey = process.env.VIP_RESELLER_API_KEY?.trim();
    return Boolean(apiId && apiKey);
  }

  /**
   * Retrieves server credentials or throws if unconfigured.
   * Never leaks secrets into error messages.
   */
  private getCredentials(): { apiId: string; apiKey: string } {
    const apiId = process.env.VIP_RESELLER_API_ID?.trim() || '';
    const apiKey = process.env.VIP_RESELLER_API_KEY?.trim() || '';
    if (!apiId || !apiKey) {
      throw new Error('VIP_RESELLER credentials (VIP_RESELLER_API_ID, VIP_RESELLER_API_KEY) are missing from environment.');
    }
    return { apiId, apiKey };
  }

  /**
   * Generates MD5 signature for API requests and webhook verification.
   * Formula: md5(API_ID + API_KEY)
   */
  generateSignature(apiId: string, apiKey: string): string {
    return crypto.createHash('md5').update(`${apiId}${apiKey}`).digest('hex');
  }

  /**
   * Classifies vendor rejection into RETRYABLE or NON_RETRYABLE.
   *
   * Fail-Safe Policy:
   * 1. Known customer/destination failure -> NON_RETRYABLE (halts waterfall -> refunds user atomically)
   * 2. Confidently identified supplier operational failure -> RETRYABLE (advances waterfall)
   * 3. Unknown / unclassified vendor rejection -> NON_RETRYABLE (halts waterfall fail-closed)
   */
  classifyFailure(message: string, rawStatus?: string): RetryClassification {
    const text = `${rawStatus || ''} ${message || ''}`.toLowerCase();

    // 1. Confidently identified customer terminal errors (NON_RETRYABLE)
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
      text.includes('nomor tujuan salah') ||
      text.includes('limit transaksi user') ||
      text.includes('format tujuan salah') ||
      text.includes('target tidak valid') ||
      text.includes('tujuan salah');

    if (isCustomerError) {
      return 'NON_RETRYABLE';
    }

    // 2. Confidently identified supplier operational failures (RETRYABLE)
    const isSupplierError =
      text.includes('gangguan') ||
      text.includes('server error') ||
      text.includes('supplier offline') ||
      text.includes('provider gangguan') ||
      text.includes('sedang gangguan') ||
      text.includes('stok kosong') ||
      text.includes('stok habis') ||
      text.includes('produk cut off') ||
      text.includes('produk sedang maintenance') ||
      text.includes('maintenance') ||
      text.includes('timeout') ||
      text.includes('limit harian supplier habis') ||
      text.includes('saldo supplier tidak cukup') ||
      text.includes('balance insufficient');

    if (isSupplierError) {
      return 'RETRYABLE';
    }

    // 3. Unknown / unclassified vendor rejection -> Fail closed
    return 'NON_RETRYABLE';
  }

  /**
   * Normalizes vendor status to DaPay standard NormalizedExecutionStatus.
   */
  normalizeStatus(rawStatus?: string, message?: string): NormalizedExecutionStatus {
    const s = String(rawStatus || '').toLowerCase().trim();
    const m = String(message || '').toLowerCase().trim();

    if (s === 'success' || s === 'sukses' || s === 'berhasil') {
      return 'SUCCESS';
    }

    if (s === 'waiting' || s === 'pending' || s === 'processing' || s === 'proses') {
      return 'PENDING';
    }

    if (s === 'error' || s === 'failed' || s === 'gagal') {
      return 'FAILED';
    }

    if (m.includes('berhasil') || m.includes('sukses')) {
      return 'SUCCESS';
    }

    if (m.includes('menunggu') || m.includes('diproses') || m.includes('waiting')) {
      return 'PENDING';
    }

    if (m.includes('gagal') || m.includes('error') || m.includes('batal')) {
      return 'FAILED';
    }

    return 'PENDING';
  }

  /**
   * Executes a purchase transaction against VIP_RESELLER.
   */
  async executeTransaction(input: GenericExecutionInput): Promise<GenericExecutionResult> {
    if (!this.isConfigured()) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'NOT_CONFIGURED',
        errorMessage: 'VIP_RESELLER credentials are not configured on the server.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
      };
    }

    const { apiId, apiKey } = this.getCredentials();
    const signature = this.generateSignature(apiId, apiKey);
    const baseUrl = this.getBaseUrl();

    // Determine specific endpoint based on destination requirements & category
    const isGameFeature = Boolean(input.destinationZoneId) ||
      Boolean(input.category && input.category.toLowerCase().includes('game'));
    const isPostpaid = Boolean(input.category && (
      input.category.toLowerCase().includes('pascabayar') ||
      input.category.toLowerCase().includes('ppob')
    ));

    let endpoint = `${baseUrl}/prepaid`;
    if (isGameFeature) {
      endpoint = `${baseUrl}/game-feature`;
    } else if (isPostpaid) {
      endpoint = `${baseUrl}/postpaid`;
    }

    const formParams = new URLSearchParams();
    formParams.append('key', apiKey);
    formParams.append('sign', signature);
    formParams.append('type', 'order');
    formParams.append('service', input.vendorSku);

    if (isGameFeature) {
      formParams.append('data_no', input.destinationUserId || input.destination);
      if (input.destinationZoneId) {
        formParams.append('data_zone', input.destinationZoneId);
      }
    } else {
      formParams.append('data_no', input.destination);
    }

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formParams.toString(),
        signal: AbortSignal.timeout(45000), // 45-second timeout
      });
    } catch (networkErr: unknown) {
      const message = networkErr instanceof Error ? networkErr.message : 'VIP_RESELLER network transport error or timeout';
      console.error('[VipResellerAdapter] Transport failure on executeTransaction:', message);

      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'NETWORK_TIMEOUT',
        errorMessage: `VIP_RESELLER transport error: ${message}`,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    // HTTP 5xx or unreadable responses map conservatively to UNKNOWN
    if (response.status >= 500) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: `HTTP_${response.status}`,
        errorMessage: `VIP_RESELLER server error: HTTP ${response.status} ${response.statusText}`,
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
        errorMessage: 'VIP_RESELLER returned an unreadable or non-JSON response body.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const parsed = rawData as {
      result?: boolean;
      data?: Record<string, unknown> | Array<Record<string, unknown>>;
      message?: string;
    };

    const item = Array.isArray(parsed.data)
      ? (parsed.data[0] || {})
      : (parsed.data || {});

    const trxid = item.trxid ? String(item.trxid) : undefined;
    const rawStatusStr = item.status ? String(item.status) : (parsed.result === false ? 'error' : 'waiting');
    const messageStr = String(item.note || parsed.message || '');
    const snStr = item.note ? String(item.note) : undefined;

    // Handle explicit API rejection (result: false)
    if (parsed.result === false) {
      const retryClassification = this.classifyFailure(messageStr, rawStatusStr);
      return {
        normalizedStatus: 'FAILED',
        rawStatus: rawStatusStr || 'API_REJECTED',
        providerReference: trxid,
        errorMessage: messageStr || 'Transaction rejected by VIP_RESELLER',
        retryClassification,
        transportOutcome: 'CONFIRMED_RESPONSE',
        rawResponse: rawData,
      };
    }

    const normalizedStatus = this.normalizeStatus(rawStatusStr, messageStr);

    let retryClassification: RetryClassification = 'NON_RETRYABLE';
    if (normalizedStatus === 'FAILED') {
      retryClassification = this.classifyFailure(messageStr, rawStatusStr);
    }

    return {
      normalizedStatus,
      rawStatus: rawStatusStr || (normalizedStatus === 'SUCCESS' ? 'success' : 'waiting'),
      providerReference: trxid,
      serialNumber: snStr,
      retryClassification,
      errorMessage: normalizedStatus === 'FAILED' ? messageStr : undefined,
      transportOutcome: 'CONFIRMED_RESPONSE',
      rawResponse: rawData,
      metadata: {
        ...(item.service ? { service: item.service } : {}),
        ...(item.price !== undefined ? { price: item.price } : {}),
        ...(item.balance !== undefined ? { balance: item.balance } : {}),
      },
    };
  }

  /**
   * Queries transaction status from VIP_RESELLER.
   * Endpoint: POST https://vip-reseller.co.id/api/prepaid (or game-feature)
   * Parameters: key, sign, type='status', trxid
   */
  async checkStatus(input: GenericStatusCheckInput): Promise<GenericExecutionResult> {
    if (!this.isConfigured()) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'NOT_CONFIGURED',
        errorMessage: 'VIP_RESELLER credentials are not configured on the server.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
      };
    }

    const { apiId, apiKey } = this.getCredentials();
    const signature = this.generateSignature(apiId, apiKey);
    const baseUrl = this.getBaseUrl();

    // Prefer providerReference if provided via additionalMetadata or input, fallback to correlationRefId
    const targetRef =
      (typeof input.additionalMetadata?.providerReference === 'string' && input.additionalMetadata.providerReference) ||
      (typeof input.additionalMetadata?.provider_ref_id === 'string' && input.additionalMetadata.provider_ref_id) ||
      (typeof input.additionalMetadata?.trxid === 'string' && input.additionalMetadata.trxid) ||
      input.correlationRefId ||
      input.orderId;

    const formParams = new URLSearchParams();
    formParams.append('key', apiKey);
    formParams.append('sign', signature);
    formParams.append('type', 'status');
    if (targetRef) {
      formParams.append('trxid', targetRef);
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/prepaid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formParams.toString(),
        signal: AbortSignal.timeout(30000), // 30-second timeout
      });
    } catch (networkErr: unknown) {
      const message = networkErr instanceof Error ? networkErr.message : 'VIP_RESELLER status check timeout';
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'STATUS_CHECK_TIMEOUT',
        errorMessage: message,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    if (response.status >= 500) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: `HTTP_${response.status}`,
        errorMessage: `VIP_RESELLER server error: HTTP ${response.status}`,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const rawData = await response.json().catch(() => null);
    if (!rawData) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'UNREADABLE_RESPONSE',
        errorMessage: 'VIP_RESELLER status check returned an unreadable response body.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const parsed = rawData as {
      result?: boolean;
      data?: Record<string, unknown> | Array<Record<string, unknown>>;
      message?: string;
    };

    const item = Array.isArray(parsed.data)
      ? (parsed.data[0] || {})
      : (parsed.data || {});

    const trxid = item.trxid ? String(item.trxid) : undefined;
    const rawStatusStr = String(item.status || (parsed.result === false ? 'error' : ''));
    const messageStr = String(item.note || parsed.message || '');
    const snStr = item.note ? String(item.note) : undefined;

    if (parsed.result === false && !item.status) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'STATUS_CHECK_ERROR',
        providerReference: trxid,
        errorMessage: messageStr || 'VIP_RESELLER status check failed',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
        rawResponse: rawData,
      };
    }

    const normalizedStatus = this.normalizeStatus(rawStatusStr, messageStr);

    let retryClassification: RetryClassification = 'NON_RETRYABLE';
    if (normalizedStatus === 'FAILED') {
      retryClassification = this.classifyFailure(messageStr, rawStatusStr);
    }

    return {
      normalizedStatus,
      rawStatus: rawStatusStr || (normalizedStatus === 'SUCCESS' ? 'success' : 'waiting'),
      providerReference: trxid,
      serialNumber: snStr,
      retryClassification,
      errorMessage: normalizedStatus === 'FAILED' ? messageStr : undefined,
      transportOutcome: 'CONFIRMED_RESPONSE',
      rawResponse: rawData,
      metadata: {
        ...(item.service ? { service: item.service } : {}),
        ...(item.price !== undefined ? { price: item.price } : {}),
        ...(item.balance !== undefined ? { balance: item.balance } : {}),
      },
    };
  }

  /**
   * Parses and cryptographically validates incoming webhook notifications from VIP_RESELLER.
   * Signature Header: X-Client-Signature or X-VIP-Signature or payload.sign: md5(api_id + api_key)
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
        message: 'Malformed VIP_RESELLER webhook payload body',
      };
    }

    if (!this.isConfigured()) {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'VIP_RESELLER is not configured on this server',
      };
    }

    const { apiId, apiKey } = this.getCredentials();
    const expectedSignature = this.generateSignature(apiId, apiKey);

    // Extract signature from headers or payload
    const receivedSignature =
      headers.get('x-client-signature') ||
      headers.get('x-vip-signature') ||
      headers.get('x-signature') ||
      (typeof payload.sign === 'string' ? payload.sign : undefined);

    if (!receivedSignature || receivedSignature.trim().toLowerCase() !== expectedSignature.toLowerCase()) {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'Invalid VIP_RESELLER webhook signature',
      };
    }

    // Extract reference information
    const rawRefId = String(payload.order_id || payload.ref_id || '');
    const cleanOrderId = rawRefId ? rawRefId.replace(/-R\d+$/, '') : '';
    const rawStatusStr = String(payload.status || '');
    const messageStr = String(payload.note || payload.message || '');
    const snStr = payload.note ? String(payload.note) : undefined;
    const trxId = payload.trxid ? String(payload.trxid) : undefined;

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
      metadata: {
        ...(payload.service ? { service: payload.service } : {}),
        ...(payload.data_no ? { data_no: payload.data_no } : {}),
        ...(payload.price !== undefined ? { price: payload.price } : {}),
        ...(payload.balance !== undefined ? { balance: payload.balance } : {}),
      },
    };
  }

  /**
   * Fetches current VIP_RESELLER merchant account balance.
   * Endpoint: POST https://vip-reseller.co.id/api/profile
   */
  async getBalance(): Promise<number> {
    const { apiId, apiKey } = this.getCredentials();
    const signature = this.generateSignature(apiId, apiKey);
    const baseUrl = this.getBaseUrl();

    const formParams = new URLSearchParams();
    formParams.append('key', apiKey);
    formParams.append('sign', signature);

    const res = await fetch(`${baseUrl}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: formParams.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`VIP_RESELLER getBalance HTTP error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const balance = Number(data?.data?.balance);
    if (isNaN(balance)) {
      throw new Error('VIP_RESELLER getBalance response missing valid numeric data.balance');
    }

    return balance;
  }
}
