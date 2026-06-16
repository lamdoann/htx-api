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
 * Thin wrapper around axios that handles HTX request signing and the common
 * response envelope.
 *
 * Concrete clients (e.g. {@link RestClient}) extend this and expose typed
 * endpoint methods, while {@link BaseRestClient.publicGet},
 * {@link BaseRestClient.privateGet} and {@link BaseRestClient.privatePost}
 * remain available for calling any endpoint directly.
 */
export declare abstract class BaseRestClient {
    protected readonly baseUrl: string;
    protected readonly host: string;
    protected readonly logger: Logger;
    private readonly apiKey?;
    private readonly apiSecret?;
    private readonly axiosInstance;
    constructor(options?: RestClientOptions, logger?: Logger);
    /**
     * Call a public GET endpoint and unwrap the HTX response envelope.
     * @throws {HtxApiError} when the server reports `status: "error"`.
     */
    publicGet<TData>(endpoint: string, params?: Record<string, unknown>): Promise<HtxRestResponse<TData>>;
    /**
     * Call a signed (private) GET endpoint. `params` are signed and sent as the
     * query string.
     * @throws {HtxApiError} when the server reports `status: "error"`.
     */
    privateGet<TData>(endpoint: string, params?: Record<string, unknown>): Promise<HtxRestResponse<TData>>;
    /**
     * Call a signed (private) POST endpoint. The auth params are signed into the
     * query string; `body` is sent as the JSON request body.
     * @throws {HtxApiError} when the server reports `status: "error"`.
     */
    privatePost<TData>(endpoint: string, body?: Record<string, unknown>, params?: Record<string, unknown>): Promise<HtxRestResponse<TData>>;
    private request;
    private buildSignedQuery;
}
//# sourceMappingURL=BaseRestClient.d.ts.map