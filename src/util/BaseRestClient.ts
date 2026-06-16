import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

import { HtxRestResponse, RestClientOptions } from '../types/shared';
import { buildSignedRestParams } from './auth';
import { DefaultLogger, Logger } from './logger';

export const DEFAULT_REST_BASE_URL = 'https://api.huobi.pro';

/**
 * Error thrown when HTX returns a non-`ok` status in the response envelope.
 */
export class HtxApiError extends Error {
  public readonly code?: string;
  public readonly response: unknown;

  constructor(message: string, code: string | undefined, response: unknown) {
    super(message);
    this.name = 'HtxApiError';
    this.code = code;
    this.response = response;
  }
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
export abstract class BaseRestClient {
  protected readonly baseUrl: string;
  protected readonly host: string;
  protected readonly logger: Logger;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(options: RestClientOptions = {}, logger: Logger = DefaultLogger) {
    this.baseUrl = options.baseUrl ?? DEFAULT_REST_BASE_URL;
    this.host = new URL(this.baseUrl).host;
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;
    this.logger = logger;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: options.timeout ?? 10_000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  /**
   * Call a public GET endpoint and unwrap the HTX response envelope.
   * @throws {HtxApiError} when the server reports `status: "error"`.
   */
  async publicGet<TData>(
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<HtxRestResponse<TData>> {
    return this.request<TData>({ method: 'GET', endpoint, params });
  }

  /**
   * Call a signed (private) GET endpoint. `params` are signed and sent as the
   * query string.
   * @throws {HtxApiError} when the server reports `status: "error"`.
   */
  async privateGet<TData>(
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<HtxRestResponse<TData>> {
    return this.request<TData>({
      method: 'GET',
      endpoint,
      params,
      signed: true,
    });
  }

  /**
   * Call a signed (private) POST endpoint. The auth params are signed into the
   * query string; `body` is sent as the JSON request body.
   * @throws {HtxApiError} when the server reports `status: "error"`.
   */
  async privatePost<TData>(
    endpoint: string,
    body?: Record<string, unknown>,
    params?: Record<string, unknown>,
  ): Promise<HtxRestResponse<TData>> {
    return this.request<TData>({
      method: 'POST',
      endpoint,
      params,
      body,
      signed: true,
    });
  }

  // --- internals ----------------------------------------------------------

  private async request<TData>(args: {
    method: 'GET' | 'POST';
    endpoint: string;
    params?: Record<string, unknown>;
    body?: Record<string, unknown>;
    signed?: boolean;
  }): Promise<HtxRestResponse<TData>> {
    const { method, endpoint, params, body, signed } = args;

    let queryParams = params;
    if (signed) {
      queryParams = this.buildSignedQuery(method, endpoint, params);
    }

    const config: AxiosRequestConfig = { method, url: endpoint, params: queryParams };
    if (body !== undefined) {
      config.data = body;
    }

    this.logger.debug(`${method} ${endpoint}`, { params, signed: !!signed });

    const { data } = await this.axiosInstance.request<HtxRestResponse<TData>>(
      config,
    );

    if (data?.status === 'error') {
      throw new HtxApiError(
        data['err-msg'] ?? 'HTX API returned an error',
        data['err-code'],
        data,
      );
    }

    return data;
  }

  private buildSignedQuery(
    method: 'GET' | 'POST',
    endpoint: string,
    params?: Record<string, unknown>,
  ): Record<string, string> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error(
        'apiKey and apiSecret are required for private endpoints. Pass them to the client constructor.',
      );
    }

    return buildSignedRestParams({
      method,
      host: this.host,
      path: endpoint,
      apiKey: this.apiKey,
      apiSecret: this.apiSecret,
      // POST bodies are not signed; only auth params (+ explicit query) are.
      query: method === 'GET' ? params : undefined,
    });
  }
}
