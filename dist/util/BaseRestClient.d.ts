import { HtxRestResponse, RestClientOptions } from '../types/shared';
import { Logger } from './logger';
export declare const DEFAULT_REST_BASE_URL = "https://api.huobi.pro";
/**
 * Error thrown when HTX returns a non-`ok` status in the response envelope.
 */
export declare class HtxApiError extends Error {
    readonly code?: string;
    readonly response: unknown;
    constructor(message: string, code: string | undefined, response: unknown);
}
/**
 * Thin wrapper around axios that handles the common HTX response envelope.
 *
 * Concrete clients (e.g. {@link RestClient}) extend this and expose typed
 * endpoint methods. Only public GET endpoints are needed for the current scope,
 * so request signing is intentionally omitted.
 */
export declare abstract class BaseRestClient {
    protected readonly baseUrl: string;
    protected readonly logger: Logger;
    private readonly axiosInstance;
    constructor(options?: RestClientOptions, logger?: Logger);
    /**
     * Perform a public GET request and unwrap the HTX response envelope.
     * @throws {HtxApiError} when the server reports `status: "error"`.
     */
    protected get<TData>(endpoint: string, params?: Record<string, unknown>): Promise<HtxRestResponse<TData>>;
}
//# sourceMappingURL=BaseRestClient.d.ts.map