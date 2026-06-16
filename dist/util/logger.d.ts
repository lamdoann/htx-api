/**
 * Minimal logger interface, modelled on the binance SDK's `DefaultLogger`.
 * Pass your own implementation to a client to integrate with winston/pino/etc.
 */
export interface Logger {
    silly(message: string, ...meta: any[]): void;
    debug(message: string, ...meta: any[]): void;
    info(message: string, ...meta: any[]): void;
    warning(message: string, ...meta: any[]): void;
    error(message: string, ...meta: any[]): void;
}
/**
 * Default logger. `silly` and `debug` are no-ops to keep output quiet; the rest
 * forward to the console.
 */
export declare const DefaultLogger: Logger;
//# sourceMappingURL=logger.d.ts.map