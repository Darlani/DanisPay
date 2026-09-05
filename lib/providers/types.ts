/**
 * Generic normalized execution status across all digital goods providers.
 * Minimal and stable domain:
 * - SUCCESS: Vendor accepted and completed transaction immediately (with SN).
 * - PENDING: Vendor accepted request into queue/processing; final completion awaits webhook or check-status.
 * - FAILED: Vendor rejected or failed the transaction request.
 */
export type NormalizedExecutionStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

/**
 * Generic retry classification:
 * - RETRYABLE: Vendor failure is transient or stock-related (e.g., supplier out of stock, vendor timeout, maintenance).
 *   The execution engine can proceed to the next cheapest alternative candidate in the waterfall.
 * - NON_RETRYABLE: Failure is terminal / customer-related (e.g., invalid phone number, invalid customer ID, bill already paid).
 *   The execution engine should abort the waterfall immediately and fail the order.
 */
export type RetryClassification = 'RETRYABLE' | 'NON_RETRYABLE';

/**
 * Transport outcome classification for execution attempts:
 * - CONFIRMED_RESPONSE: The vendor endpoint responded with a definitive HTTP/API status (SUCCESS, PENDING, or FAILED).
 * - UNKNOWN: Network timeout, connection reset, socket hang up, or unreadable response occurred after request was dispatched.
 *   The transaction may or may not have been accepted by the vendor.
 */
export type TransportOutcome = 'CONFIRMED_RESPONSE' | 'UNKNOWN';

/**
 * Functional capabilities declared by a provider adapter.
 */
export interface ProviderCapabilities {
  /** Supports prepaid products (games, pulsa, e-money, vouchers) */
  readonly supportsPrepaid: boolean;
  /** Supports postpaid bill inquiries & payments (PLN pasca, BPJS, PDAM) */
  readonly supportsPostpaid: boolean;
  /** Provides an endpoint to query live transaction status */
  readonly supportsStatusCheck: boolean;
  /** Provides webhook callbacks for asynchronous status updates */
  readonly supportsWebhook: boolean;
  /** Provides an endpoint to check operational deposit balance */
  readonly supportsBalance: boolean;
}

/**
 * DaPay-side generic execution input passed to a provider adapter.
 * Contains purely order and destination semantics without provider-specific wire formatting.
 */
export interface GenericExecutionInput {
  /** Internal DaPay order ID (e.g., "INV-20260903-ABC") */
  readonly orderId: string;
  /** 1-based attempt sequence number (1 for initial attempt, 2 for retry, etc.) */
  readonly attemptNumber: number;
  /** Deterministic correlation reference ID (e.g., "INV-20260903-ABC" or "INV-20260903-ABC-R2") */
  readonly correlationRefId: string;
  /** Provider-specific item SKU code in supplier warehouse */
  readonly vendorSku: string;
  /** Combined destination identifier (phone number, meter ID, or raw target) */
  readonly destination: string;
  /** Customer/Gamer User ID (for games requiring separated User ID) */
  readonly destinationUserId?: string;
  /** Server/Zone ID (for games requiring separated Server/Zone ID like MLBB, Genshin) */
  readonly destinationZoneId?: string;
  /** Customer display name if known (e.g., for PLN or inquiry verification) */
  readonly customerName?: string;
  /** PLN segment/power (e.g., "R1M/900") */
  readonly segmentPower?: string;
  /** Nominal denomination or transaction amount */
  readonly amount?: number;
  /** Logical storefront product name */
  readonly productName?: string;
  /** Product category slug */
  readonly category?: string;
  /** Extensible structured metadata without vendor coupling */
  readonly additionalMetadata?: Record<string, unknown>;
}

/**
 * DaPay-side generic status check input passed to a provider adapter.
 */
export interface GenericStatusCheckInput {
  readonly orderId: string;
  readonly correlationRefId: string;
  readonly vendorSku: string;
  readonly destination: string;
  readonly additionalMetadata?: Record<string, unknown>;
}

/**
 * Provider-agnostic execution result returned by an adapter.
 */
export interface GenericExecutionResult {
  /** Normalized status understood by the execution engine */
  readonly normalizedStatus: NormalizedExecutionStatus;
  /** Original vendor status string (e.g., "Sukses", "Pending", "Gagal", "Success", "Failed") */
  readonly rawStatus: string;
  /** Vendor reference ID or transaction ID */
  readonly providerReference?: string;
  /** Serial Number (SN) or voucher code if provided upon execution */
  readonly serialNumber?: string;
  /** Categorization whether engine should attempt another supplier */
  readonly retryClassification: RetryClassification;
  /** Raw vendor error code if available */
  readonly errorCode?: string;
  /** Human-readable vendor error or status message */
  readonly errorMessage?: string;
  /** Transport outcome: whether vendor definitely responded or network was ambiguous */
  readonly transportOutcome?: TransportOutcome;
  /** Server-only diagnostic response body (never exposed to client) */
  readonly rawResponse?: unknown;
  /** Normalized metadata extracted from vendor response (e.g. customer name, tariff) */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Normalized result of an incoming webhook parsed by an adapter.
 */
export interface GenericWebhookResult {
  /** True if the webhook signature/token/IP is cryptographically valid */
  readonly isValid: boolean;
  /** Clean base DaPay order ID (stripped of retry suffix) */
  readonly orderId: string;
  /** Raw correlation ref ID sent in webhook (e.g., "INV-123-R2") */
  readonly rawRefId: string;
  /** Normalized status mapped from vendor event */
  readonly normalizedStatus: NormalizedExecutionStatus;
  /** Serial Number (SN) if included in webhook event */
  readonly serialNumber?: string;
  /** Vendor message or error explanation */
  readonly message?: string;
  /** Diagnostic raw payload for server logs */
  readonly rawPayload?: unknown;
  /** Structured metadata (e.g. meter reading, tariff, customer name) */
  readonly metadata?: Record<string, unknown>;
  /** Provider-generated transaction reference ID (e.g. trx_id, trxid) */
  readonly providerReference?: string;
}

/**
 * Minimum provider-neutral adapter contract.
 * Every provider integration (Digiflazz, APIGames, Uniplay, VIP Reseller)
 * must implement this contract.
 */
export interface IProviderAdapter {
  /** Unique uppercase provider code (matches public.providers.code, e.g. "DIGIFLAZZ") */
  readonly providerCode: string;
  /** Declared functional capabilities of this adapter */
  readonly capabilities: ProviderCapabilities;

  /**
   * Optional: Checks whether the adapter has all required credentials configured in server environment.
   * If omitted, adapter is assumed configured if registered.
   */
  isConfigured?(): boolean;

  /**
   * Required: Executes a digital product purchase against the vendor API.
   * Owns request serialization, authentication, network transport, and status normalization.
   */
  executeTransaction(input: GenericExecutionInput): Promise<GenericExecutionResult>;

  /**
   * Optional: Polls or queries the live transaction status from vendor endpoint.
   */
  checkStatus?(input: GenericStatusCheckInput): Promise<GenericExecutionResult>;

  /**
   * Optional: Validates incoming webhook authenticity and normalizes event payload.
   */
  parseWebhook?(headers: Headers, rawBody: string): Promise<GenericWebhookResult>;

  /**
   * Optional: Fetches operational deposit/credit balance from vendor API.
   */
  getBalance?(): Promise<number>;
}

