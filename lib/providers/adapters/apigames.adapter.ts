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
 * Official APIGames Provider Adapter for DaPay.
 *
 * Implements IProviderAdapter strictly according to APIGames v2 wire protocol:
 * - Transaction: POST https://v1.apigames.id/v2/transaksi
 * - Status Check: GET https://v1.apigames.id/v2/transaksi/status
 * - Webhook: POST with X-Apigames-Authorization header
 * - Merchant Info / Balance: GET https://v1.apigames.id/merchant/{merchant_id}
 *
 * Critical Invariants:
 * - Top-level `response.status === 1` is gateway envelope acceptance, NEVER treated as transaction SUCCESS.
 * - Transaction outcome is derived strictly from `data.status`, with `data.message`/`message` assisting.
 * - `Sukses Sebagian` is conservatively preserved as unresolved `PENDING` (never full `SUCCESS`).
 * - Unknown/unmatched vendor rejections fail closed as `NON_RETRYABLE` (never default to retryable fallback).
 * - Timeouts, connection resets, HTTP 5xx, and unreadable gateway responses map to `transportOutcome: 'UNKNOWN'`.
 */
export class APIGamesAdapter implements IProviderAdapter {
  readonly providerCode = 'APIGAMES';

  readonly capabilities: ProviderCapabilities = {
    supportsPrepaid: true,
    supportsPostpaid: false,
    supportsStatusCheck: true,
    supportsWebhook: true,
    supportsBalance: true,
  };

  private readonly baseUrl = 'https://v1.apigames.id';

  /**
   * Checks whether APIGames credentials are configured in server environment.
   */
  isConfigured(): boolean {
    const merchantId = process.env.APIGAMES_MERCHANT_ID?.trim();
    const secretKey = process.env.APIGAMES_SECRET_KEY?.trim();
    return Boolean(merchantId && secretKey);
  }

  private getCredentials(): { merchantId: string; secretKey: string } {
    const merchantId = process.env.APIGAMES_MERCHANT_ID?.trim() || '';
    const secretKey = process.env.APIGAMES_SECRET_KEY?.trim() || '';
    if (!merchantId || !secretKey) {
      throw new Error('APIGames credentials (APIGAMES_MERCHANT_ID, APIGAMES_SECRET_KEY) are missing from environment.');
    }
    return { merchantId, secretKey };
  }

  /**
   * Generates MD5 signature for transaction, status check, or webhook verification.
   * Formula: md5(merchant_id + ":" + secret_key + ":" + ref_id)
   */
  generateTransactionSignature(merchantId: string, secretKey: string, refId: string): string {
    return crypto.createHash('md5').update(`${merchantId}:${secretKey}:${refId}`).digest('hex');
  }

  /**
   * Generates MD5 signature for balance inquiry requests.
   * Formula: md5(merchant_id + ":" + secret_key)
   */
  generateBalanceSignature(merchantId: string, secretKey: string): string {
    return crypto.createHash('md5').update(`${merchantId}:${secretKey}`).digest('hex');
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
      text.includes('user tidak valid') ||
      text.includes('id salah') ||
      text.includes('zone id salah') ||
      text.includes('server id salah') ||
      text.includes('server tidak sesuai') ||
      text.includes('tujuan diblokir') ||
      text.includes('account banned') ||
      text.includes('limit transaksi user') ||
      text.includes('format tujuan salah');

    if (isCustomerError) {
      return 'NON_RETRYABLE';
    }

    // 2. Confidently identified provider operational/stock errors (RETRYABLE)
    const isProviderRetryable =
      text.includes('stok') || // covers "stok habis", "stok produk habis", "stok kosong"
      text.includes('out of stock') ||
      text.includes('produk tidak tersedia') ||
      text.includes('gangguan') || // covers "produk gangguan", "server gangguan"
      text.includes('saldo merchant tidak cukup') ||
      text.includes('saldo tidak cukup') ||
      text.includes('server maintenance') ||
      text.includes('cut off') ||
      text.includes('provider timeout');

    if (isProviderRetryable) {
      return 'RETRYABLE';
    }

    // 3. Fail-safe default for unclassified rejections: NON_RETRYABLE
    return 'NON_RETRYABLE';
  }

  /**
   * Normalizes APIGames transaction status fields to DaPay's NormalizedExecutionStatus.
   */
  private normalizeStatus(rawStatus?: string, message?: string): NormalizedExecutionStatus {
    const s = (rawStatus || '').trim().toLowerCase();
    const m = (message || '').trim().toLowerCase();

    if (s === 'sukses' || s === 'success') {
      return 'SUCCESS';
    }

    // Validasi Provider: check both status and message channels
    if (s.includes('validasi') || m.includes('validasi provider') || m.includes('validasi')) {
      return 'PENDING';
    }

    // Sukses Sebagian: conservative financial policy -> PENDING
    if (s.includes('sebagian') || m.includes('sebagian')) {
      return 'PENDING';
    }

    if (s === 'pending' || s === 'proses' || s === 'process') {
      return 'PENDING';
    }

    if (s === 'gagal' || s === 'failed') {
      return 'FAILED';
    }

    // Secondary fallback based on message if status was not explicit
    if (m.includes('status pending') || m.includes('proses')) {
      return 'PENDING';
    }
    if (m.includes('berhasil') || m.includes('sukses')) {
      return 'SUCCESS';
    }

    return 'FAILED';
  }

  /**
   * Executes a prepaid digital voucher/game purchase against APIGames.
   * Endpoint: POST https://v1.apigames.id/v2/transaksi
   */
  async executeTransaction(input: GenericExecutionInput): Promise<GenericExecutionResult> {
    if (!this.isConfigured()) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'NOT_CONFIGURED',
        errorMessage: 'APIGames credentials are not configured on the server.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
      };
    }

    const { merchantId, secretKey } = this.getCredentials();
    const signature = this.generateTransactionSignature(merchantId, secretKey, input.correlationRefId);

    const payload: Record<string, unknown> = {
      ref_id: input.correlationRefId,
      merchant_id: merchantId,
      produk: input.vendorSku,
      tujuan: input.destinationUserId || input.destination,
      server_id: input.destinationZoneId || '',
      signature,
    };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v2/transaksi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000), // 45-second timeout
      });
    } catch (networkErr: unknown) {
      const message = networkErr instanceof Error ? networkErr.message : 'APIGames network transport error or timeout';
      console.error('[APIGamesAdapter] Transport failure on executeTransaction:', message);

      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'NETWORK_TIMEOUT',
        errorMessage: `APIGames transport error: ${message}`,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    // HTTP 5xx or unreadable responses map conservatively to UNKNOWN
    if (response.status >= 500) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: `HTTP_${response.status}`,
        errorMessage: `APIGames server error: HTTP ${response.status} ${response.statusText}`,
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
        errorMessage: 'APIGames returned an unreadable or non-JSON response body.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const parsed = rawData as {
      status?: number | string;
      rc?: number | string;
      message?: string;
      data?: Record<string, unknown>;
    };

    // Protocol Error Guard: top-level status=0 is an API/envelope error (e.g. signature error)
    if (parsed.status === 0 && !parsed.data) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'API_ERROR_0',
        errorMessage: parsed.message || 'APIGames API protocol error (status 0)',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
        rawResponse: rawData,
      };
    }

    const d = parsed.data || {};
    const rawStatusStr = String(d.status || (parsed.status === 0 ? 'Gagal' : ''));
    const messageStr = String(d.message || parsed.message || '');
    const snStr = d.sn ? String(d.sn) : undefined;
    const trxId = d.trx_id ? String(d.trx_id) : undefined;

    const normalizedStatus = this.normalizeStatus(rawStatusStr, messageStr);

    let retryClassification: RetryClassification = 'NON_RETRYABLE';
    if (normalizedStatus === 'FAILED') {
      retryClassification = this.classifyFailure(messageStr, rawStatusStr);
    }

    return {
      normalizedStatus,
      rawStatus: rawStatusStr || (normalizedStatus === 'SUCCESS' ? 'Sukses' : 'Pending'),
      providerReference: trxId,
      serialNumber: snStr,
      retryClassification,
      errorCode: parsed.rc ? String(parsed.rc) : undefined,
      errorMessage: messageStr,
      transportOutcome: 'CONFIRMED_RESPONSE',
      rawResponse: rawData,
      metadata: {
        ...(d.code ? { code: d.code } : {}),
        ...(d.destination ? { destination: d.destination } : {}),
        ...(d.server_id ? { server_id: d.server_id } : {}),
        ...(d.price !== undefined ? { price: d.price } : {}),
        ...(d.balance !== undefined ? { balance: d.balance } : {}),
      },
    };
  }

  /**
   * Queries transaction status from APIGames.
   * Endpoint: GET https://v1.apigames.id/v2/transaksi/status?merchant_id=...&ref_id=...&signature=...
   */
  async checkStatus(input: GenericStatusCheckInput): Promise<GenericExecutionResult> {
    if (!this.isConfigured()) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'NOT_CONFIGURED',
        errorMessage: 'APIGames credentials are not configured on the server.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
      };
    }

    const { merchantId, secretKey } = this.getCredentials();
    const signature = this.generateTransactionSignature(merchantId, secretKey, input.correlationRefId);

    const queryParams = new URLSearchParams({
      merchant_id: merchantId,
      ref_id: input.correlationRefId,
      signature,
    });

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v2/transaksi/status?${queryParams.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30000), // 30-second timeout
      });
    } catch (networkErr: unknown) {
      const message = networkErr instanceof Error ? networkErr.message : 'APIGames status check timeout';
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
        errorMessage: `APIGames server error: HTTP ${response.status}`,
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const rawData = await response.json().catch(() => null);
    if (!rawData) {
      return {
        normalizedStatus: 'PENDING',
        rawStatus: 'UNREADABLE_RESPONSE',
        errorMessage: 'APIGames status check returned an unreadable response body.',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'UNKNOWN',
      };
    }

    const parsed = rawData as {
      status?: number | string;
      rc?: number | string;
      message?: string;
      data?: Record<string, unknown>;
    };

    if (parsed.status === 0 && !parsed.data) {
      return {
        normalizedStatus: 'FAILED',
        rawStatus: 'API_ERROR_0',
        errorMessage: parsed.message || 'APIGames status check API protocol error (status 0)',
        retryClassification: 'NON_RETRYABLE',
        transportOutcome: 'CONFIRMED_RESPONSE',
        rawResponse: rawData,
      };
    }

    const d = parsed.data || {};
    const rawStatusStr = String(d.status || '');
    const messageStr = String(d.message || parsed.message || '');
    const snStr = d.sn ? String(d.sn) : undefined;
    const trxId = d.trx_id ? String(d.trx_id) : undefined;

    const normalizedStatus = this.normalizeStatus(rawStatusStr, messageStr);

    let retryClassification: RetryClassification = 'NON_RETRYABLE';
    if (normalizedStatus === 'FAILED') {
      retryClassification = this.classifyFailure(messageStr, rawStatusStr);
    }

    return {
      normalizedStatus,
      rawStatus: rawStatusStr || (normalizedStatus === 'SUCCESS' ? 'Sukses' : 'Pending'),
      providerReference: trxId,
      serialNumber: snStr,
      retryClassification,
      errorCode: parsed.rc ? String(parsed.rc) : undefined,
      errorMessage: messageStr,
      transportOutcome: 'CONFIRMED_RESPONSE',
      rawResponse: rawData,
      metadata: {
        ...(d.code ? { code: d.code } : {}),
        ...(d.destination ? { destination: d.destination } : {}),
        ...(d.server_id ? { server_id: d.server_id } : {}),
        ...(d.price !== undefined ? { price: d.price } : {}),
        ...(d.balance !== undefined ? { balance: d.balance } : {}),
      },
    };
  }

  /**
   * Validates and normalizes incoming APIGames webhook callback.
   * Header: X-Apigames-Authorization
   * Signature: md5(merchant_id + ":" + secret_key + ":" + ref_id)
   */
  async parseWebhook(headers: Headers, rawBody: string): Promise<GenericWebhookResult> {
    const authHeader = headers.get('X-Apigames-Authorization') || headers.get('x-apigames-authorization');
    if (!authHeader) {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'Missing X-Apigames-Authorization header',
      };
    }

    let merchantId = '';
    let secretKey = '';
    try {
      const creds = this.getCredentials();
      merchantId = creds.merchantId;
      secretKey = creds.secretKey;
    } catch {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'Server APIGames credentials unconfigured',
      };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'Invalid webhook JSON body',
      };
    }

    const rawRefId = String(payload.ref_id || '');
    if (!rawRefId) {
      return {
        isValid: false,
        orderId: '',
        rawRefId: '',
        normalizedStatus: 'FAILED',
        message: 'Webhook payload missing ref_id',
      };
    }

    const expectedSignature = this.generateTransactionSignature(merchantId, secretKey, rawRefId);
    if (authHeader.toLowerCase() !== expectedSignature.toLowerCase()) {
      return {
        isValid: false,
        orderId: '',
        rawRefId,
        normalizedStatus: 'FAILED',
        message: 'Invalid X-Apigames-Authorization signature',
      };
    }

    const cleanOrderId = rawRefId.replace(/-R\d+$/, '');
    const rawStatusStr = String(payload.status || '');
    const messageStr = String(payload.message || '');
    const snStr = payload.sn ? String(payload.sn) : undefined;

    const normalizedStatus = this.normalizeStatus(rawStatusStr, messageStr);

    return {
      isValid: true,
      orderId: cleanOrderId,
      rawRefId,
      normalizedStatus,
      providerReference: payload.trx_id ? String(payload.trx_id) : undefined,
      serialNumber: snStr,
      message: messageStr || rawStatusStr,
      rawPayload: payload,
      metadata: {
        ...(payload.merchant_id ? { merchant_id: payload.merchant_id } : {}),
        ...(payload.trx_id ? { trx_id: payload.trx_id } : {}),
        ...(payload.destination ? { destination: payload.destination } : {}),
        ...(payload.product_code ? { product_code: payload.product_code } : {}),
        ...(payload.product_code_master ? { product_code_master: payload.product_code_master } : {}),
        ...(payload.last_balance !== undefined ? { last_balance: payload.last_balance } : {}),
        ...(payload.product_detail ? { product_detail: payload.product_detail } : {}),
      },
    };
  }

  /**
   * Fetches current APIGames merchant account balance.
   * Endpoint: GET https://v1.apigames.id/merchant/{merchant_id}?signature={signature}
   */
  async getBalance(): Promise<number> {
    const { merchantId, secretKey } = this.getCredentials();
    const signature = this.generateBalanceSignature(merchantId, secretKey);

    const res = await fetch(`${this.baseUrl}/merchant/${encodeURIComponent(merchantId)}?signature=${signature}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`APIGames getBalance HTTP error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const saldo = Number(data?.data?.saldo);
    if (isNaN(saldo)) {
      throw new Error('APIGames getBalance response missing valid numeric data.saldo');
    }

    return saldo;
  }
}
