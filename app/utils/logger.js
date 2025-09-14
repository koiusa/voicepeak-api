/**
 * Centralized logging utility for the Voicepeak API
 * Handles both console and file logging with timestamps
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log file configuration
const LOG_FILE = path.join(__dirname, '..', '..', 'app.log');

/**
 * Write log message to both console and file
 * @param {string} message - Log message
 * @param {string} level - Log level (INFO, ERROR, WARN, DEBUG)
 */
function writeLog(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    // Output to console and file
    process.stdout.write(logMessage);
    fs.appendFileSync(LOG_FILE, logMessage);
}

/**
 * Logger class with different log levels
 */
export class Logger {
    static info(...args) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        writeLog(message, 'INFO');
    }

    static error(...args) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        writeLog(message, 'ERROR');
    }

    static warn(...args) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        writeLog(message, 'WARN');
    }

    static debug(...args) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        writeLog(message, 'DEBUG');
    }

    /**
     * Log HTTP request with timestamp and IP
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static logRequest(req, res) {
        const timestamp = new Date().toISOString();
        const method = req.method;
        const url = req.url;
        const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
        
        this.info(`[${timestamp}] ${method} ${url} - ${ip}`);
        
        // Log response when complete
        const originalEnd = res.end;
        res.end = function(...args) {
            Logger.info(`[${timestamp}] ${method} ${url} - ${res.statusCode} - ${ip}`);
            originalEnd.apply(this, args);
        };
    }

    /**
     * Override console methods to use centralized logging
     */
    static setupConsoleOverride() {
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;

        console.log = (...args) => {
            this.info(...args);
        };

        console.error = (...args) => {
            this.error(...args);
        };

        // Store original methods for potential restoration
        this.originalConsoleLog = originalConsoleLog;
        this.originalConsoleError = originalConsoleError;
    }

    /**
     * Restore original console methods
     */
    static restoreConsoleOriginal() {
        if (this.originalConsoleLog) {
            console.log = this.originalConsoleLog;
        }
        if (this.originalConsoleError) {
            console.error = this.originalConsoleError;
        }
    }
}