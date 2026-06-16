"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signHmacSha256 = signHmacSha256;
exports.htxTimestamp = htxTimestamp;
exports.buildSignedRestParams = buildSignedRestParams;
exports.buildWsAuthParams = buildWsAuthParams;
const crypto_1 = require("crypto");
/** HMAC-SHA256 sign `payload` with `secret`, returning a base64 string. */
function signHmacSha256(secret, payload) {
    return (0, crypto_1.createHmac)('sha256', secret).update(payload).digest('base64');
}
/** UTC timestamp in HTX's required `YYYY-MM-DDTHH:mm:ss` format (no millis). */
function htxTimestamp(date = new Date()) {
    return date.toISOString().replace(/\.\d{3}Z$/, '');
}
/** Encode a params object into a sorted, percent-encoded query string. */
function toSortedEncodedQuery(params) {
    return Object.keys(params)
        .sort()
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
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
function buildSignedRestParams(input) {
    const timestamp = input.timestamp ?? htxTimestamp();
    const params = {
        AccessKeyId: input.apiKey,
        SignatureMethod: 'HmacSHA256',
        SignatureVersion: '2',
        Timestamp: timestamp,
    };
    for (const [key, value] of Object.entries(input.query ?? {})) {
        if (value !== undefined && value !== null) {
            params[key] = String(value);
        }
    }
    const query = toSortedEncodedQuery(params);
    const payload = `${input.method}\n${input.host}\n${input.path}\n${query}`;
    params.Signature = signHmacSha256(input.apiSecret, payload);
    return params;
}
/**
 * Build the `params` object for the `/ws/v2` auth request
 * (`{ action: "req", ch: "auth", params }`).
 *
 * Same scheme as REST signing (v2.1): method is always `GET` and the path is
 * the WebSocket path, e.g. `/ws/v2`.
 */
function buildWsAuthParams(input) {
    const timestamp = input.timestamp ?? htxTimestamp();
    const signed = {
        accessKey: input.apiKey,
        signatureMethod: 'HmacSHA256',
        signatureVersion: '2.1',
        timestamp,
    };
    const query = toSortedEncodedQuery(signed);
    const payload = `GET\n${input.host}\n${input.path}\n${query}`;
    const signature = signHmacSha256(input.apiSecret, payload);
    return {
        authType: 'api',
        accessKey: input.apiKey,
        signatureMethod: 'HmacSHA256',
        signatureVersion: '2.1',
        timestamp,
        signature,
    };
}
//# sourceMappingURL=auth.js.map