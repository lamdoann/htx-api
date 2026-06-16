"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRestClient = exports.HtxApiError = exports.DEFAULT_REST_BASE_URL = void 0;
const axios_1 = __importDefault(require("axios"));
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
 * Thin wrapper around axios that handles the common HTX response envelope.
 *
 * Concrete clients (e.g. {@link RestClient}) extend this and expose typed
 * endpoint methods. Only public GET endpoints are needed for the current scope,
 * so request signing is intentionally omitted.
 */
class BaseRestClient {
    constructor(options = {}, logger = logger_1.DefaultLogger) {
        this.baseUrl = options.baseUrl ?? exports.DEFAULT_REST_BASE_URL;
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
     * Perform a public GET request and unwrap the HTX response envelope.
     * @throws {HtxApiError} when the server reports `status: "error"`.
     */
    async get(endpoint, params) {
        const config = { params };
        this.logger.debug(`GET ${endpoint}`, params);
        const { data } = await this.axiosInstance.get(endpoint, config);
        if (data?.status === 'error') {
            throw new HtxApiError(data['err-msg'] ?? 'HTX API returned an error', data['err-code'], data);
        }
        return data;
    }
}
exports.BaseRestClient = BaseRestClient;
//# sourceMappingURL=BaseRestClient.js.map