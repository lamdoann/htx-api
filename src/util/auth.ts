import { createHmac } from 'crypto';

/** HMAC-SHA256 sign `payload` with `secret`, returning a base64 string. */
export function signHmacSha256(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64');
}

/** UTC timestamp in HTX's required `YYYY-MM-DDTHH:mm:ss` format (no millis). */
export function htxTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '');
}

/** Encode a params object into a sorted, percent-encoded query string. */
function toSortedEncodedQuery(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

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
export function buildSignedRestParams(
  input: SignedRestParamsInput,
): Record<string, string> {
  const timestamp = input.timestamp ?? htxTimestamp();

  const params: Record<string, string> = {
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
export function buildWsAuthParams(input: {
  host: string;
  path: string;
  apiKey: string;
  apiSecret: string;
  timestamp?: string;
}): WsAuthParams {
  const timestamp = input.timestamp ?? htxTimestamp();

  const signed: Record<string, string> = {
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
