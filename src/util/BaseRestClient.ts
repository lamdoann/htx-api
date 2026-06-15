import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

import { HtxRestResponse, RestClientOptions } from '../types/shared';
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
 * Thin wrapper around axios that handles the common HTX response envelope.
 *
 * Concrete clients (e.g. {@link RestClient}) extend this and expose typed
 * endpoint methods. Only public GET endpoints are needed for the current scope,
 * so request signing is intentionally omitted.
 */
export abstract class BaseRestClient {
  protected readonly baseUrl: string;
  protected readonly logger: Logger;
  private readonly axiosInstance: AxiosInstance;

  constructor(options: RestClientOptions = {}, logger: Logger = DefaultLogger) {
    this.baseUrl = options.baseUrl ?? DEFAULT_REST_BASE_URL;
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
   * Perform a public GET request and unwrap the HTX response envelope.
   * @throws {HtxApiError} when the server reports `status: "error"`.
   */
  protected async get<TData>(
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<HtxRestResponse<TData>> {
    const config: AxiosRequestConfig = { params };

    this.logger.debug(`GET ${endpoint}`, params);

    const { data } = await this.axiosInstance.get<HtxRestResponse<TData>>(
      endpoint,
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
}
