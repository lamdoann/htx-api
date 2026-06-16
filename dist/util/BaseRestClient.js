"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRestClient = exports.HtxApiError = exports.DEFAULT_REST_BASE_URL = void 0;
const axios_1 = __importDefault(require("axios"));
const auth_1 = require("./auth");
const logger_1 = require("./logger");
exports.DEFAULT_REST_BASE_URL = 'https://api.huobi.pro';
/**
 * Error thrown when HTX returns a non-`ok` status in the response envelope.
 */
class HtxApiError extends Error {
    constructor(message, code, response) {
        super(message);
        this.name = 'HtxApiError';
        this.code = code;
        this.response = response;
    }
}
exports.HtxApiError = HtxApiError;
/**
 * Thin wrapper around axios that handles HTX request signing and the common
 * response envelope.
 *
 * Concrete clients (e.g. {@link RestClient}) extend this and expose typed
 * endpoint methods, while {@link BaseRestClient.publicGet},
 * {@link BaseRestClient.privateGet} and {@link BaseRestClient.privatePost}
 * remain available for calling any endpoint directly.
 */
class BaseRestClient {
    constructor(options = {}, logger = logger_1.DefaultLogger) {
        this.baseUrl = options.baseUrl ?? exports.DEFAULT_REST_BASE_URL;
        this.host = new URL(this.baseUrl).host;
        this.apiKey = options.apiKey;
        this.apiSecret = options.apiSecret;
        this.logger = logger;
        this.axiosInstance = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: options.timeout ?? 10000,
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
    async publicGet(endpoint, params) {
        return this.request({ method: 'GET', endpoint, params });
    }
    /**
     * Call a signed (private) GET endpoint. `params` are signed and sent as the
     * query string.
     * @throws {HtxApiError} when the server reports `status: "error"`.
     */
    async privateGet(endpoint, params) {
        return this.request({
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
    async privatePost(endpoint, body, params) {
        return this.request({
            method: 'POST',
            endpoint,
            params,
            body,
            signed: true,
        });
    }
    // --- internals ----------------------------------------------------------
    async request(args) {
        const { method, endpoint, params, body, signed } = args;
        let queryParams = params;
        if (signed) {
            queryParams = this.buildSignedQuery(method, endpoint, params);
        }
        const config = { method, url: endpoint, params: queryParams };
        if (body !== undefined) {
            config.data = body;
        }
        this.logger.debug(`${method} ${endpoint}`, { params, signed: !!signed });
        const { data } = await this.axiosInstance.request(config);
        if (data?.status === 'error') {
            throw new HtxApiError(data['err-msg'] ?? 'HTX API returned an error', data['err-code'], data);
        }
        return data;
    }
    buildSignedQuery(method, endpoint, params) {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('apiKey and apiSecret are required for private endpoints. Pass them to the client constructor.');
        }
        return (0, auth_1.buildSignedRestParams)({
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
exports.BaseRestClient = BaseRestClient;
//# sourceMappingURL=BaseRestClient.js.map