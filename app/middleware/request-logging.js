/**
 * Request logging middleware
 * Centralizes HTTP request/response logging functionality
 */
import { Logger } from '../utils/logger.js';

/**
 * Create request logging middleware
 * @returns {Function} Express middleware function
 */
export function requestLoggingMiddleware() {
    return (req, res, next) => {
        const timestamp = new Date().toISOString();
        const method = req.method;
        const url = req.url;
        const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
        
        Logger.info(`[${timestamp}] ${method} ${url} - ${ip}`);
        
        // Log response completion
        const originalEnd = res.end;
        res.end = function(...args) {
            Logger.info(`[${timestamp}] ${method} ${url} - ${res.statusCode} - ${ip}`);
            originalEnd.apply(this, args);
        };
        
        next();
    };
}