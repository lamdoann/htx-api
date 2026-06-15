/* eslint-disable @typescript-eslint/no-explicit-any */

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
export const DefaultLogger: Logger = {
  silly: () => {},
  debug: () => {},
  info: (...params) => console.info(...params),
  warning: (...params) => console.warn(...params),
  error: (...params) => console.error(...params),
};
