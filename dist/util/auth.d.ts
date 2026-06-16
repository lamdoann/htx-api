/** HMAC-SHA256 sign `payload` with `secret`, returning a base64 string. */
export declare function signHmacSha256(secret: string, payload: string): string;
/** UTC timestamp in HTX's required `YYYY-MM-DDTHH:mm:ss` format (no millis). */
export declare function htxTimestamp(date?: Date): string;
export interface SignedRestParamsInput {
    method: 'GET' | 'POST';
    host: string;
    path: string;
    apiKey: string;
    apiSecret: string;
    /** Extra query params to include in the signature (GET requests). */
    query?: Record<string, unknown>;
    timestamp?: string;
}
/**
 * Build the full set of query params (including `Signature`) required to call a
 * private HTX REST endpoint.
 *
 * The signed payload is:
 * ```
 * METHOD\nHOST\nPATH\n<sorted & encoded query params>
 * ```
 * For POST requests the JSON body is NOT part of the signature — only the auth
 * query params (and any extra query params) are signed.
 */
export declare function buildSignedRestParams(input: SignedRestParamsInput): Record<string, string>;
export interface WsAuthParams {
    authType: 'api';
    accessKey: string;
    signatureMethod: 'HmacSHA256';
    signatureVersion: '2.1';
    timestamp: string;
    signature: string;
}
/**
 * Build the `params` object for the `/ws/v2` auth request
 * (`{ action: "req", ch: "auth", params }`).
 *
 * Same scheme as REST signing (v2.1): method is always `GET` and the path is
 * the WebSocket path, e.g. `/ws/v2`.
 */
export declare function buildWsAuthParams(input: {
    host: string;
    path: string;
    apiKey: string;
    apiSecret: string;
    timestamp?: string;
}): WsAuthParams;
//# sourceMappingURL=auth.d.ts.map