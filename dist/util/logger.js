"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultLogger = void 0;
/**
 * Default logger. `silly` and `debug` are no-ops to keep output quiet; the rest
 * forward to the console.
 */
exports.DefaultLogger = {
    silly: () => { },
    debug: () => { },
    info: (...params) => console.info(...params),
    warning: (...params) => console.warn(...params),
    error: (...params) => console.error(...params),
};
//# sourceMappingURL=logger.js.map