/**
 * Security utilities for the Voicepeak API
 * Provides input validation, sanitization, and security controls
 */
import { spawn } from 'child_process';
import path from 'path';
import { CONFIG } from './config/constants.js';

/**
 * Security utility class with comprehensive validation and sanitization
 */
export class SecurityUtils {
    
    // Common validation patterns
    static PATTERNS = {
        NARRATOR: /^[a-zA-Z0-9\s\-_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/,
        EMOTION: /^[a-zA-Z][a-zA-Z0-9_]*(?:=[0-9]+)?$/,
        DANGEROUS_CHARS: /[`$\\;&|<>]/,
        CONTROL_CHARS: /[\x00-\x1F\x7F]/,
        HTML_TAGS: /<[^>]*>/,
        JAVASCRIPT: /javascript:/i,
        SQL_INJECTION: /[';"\-\-\/\*\*\/xX]/,
        SQL_KEYWORDS: /\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE|EXEC|EXECUTE)\b/i,
        COMMAND_INJECTION: /[\$\(\)`]|\$\(.*\)|`.*`/
    };

    // Rate limiting storage
    static rateLimiter = new Map();

    /**
     * Validate and sanitize narrator name
     * @param {string} narrator - Narrator name to validate
     * @returns {string} Sanitized narrator name
     * @throws {Error} If validation fails
     */
    static validateNarrator(narrator) {
        if (!narrator || typeof narrator !== 'string') {
            throw new Error('ナレーター名が無効です');
        }

        if (!this.PATTERNS.NARRATOR.test(narrator)) {
            throw new Error('ナレーター名に許可されていない文字が含まれています');
        }

        if (narrator.length > CONFIG.TEXT_LIMITS.MAX_NARRATOR_LENGTH) {
            throw new Error('ナレーター名が長すぎます');
        }

        return narrator.trim();
    }

    /**
     * Validate and sanitize emotion parameter
     * @param {string} emotion - Emotion parameter to validate
     * @returns {string} Sanitized emotion parameter
     * @throws {Error} If validation fails
     */
    static validateEmotion(emotion) {
        if (!emotion || typeof emotion !== 'string') {
            throw new Error('感情パラメータが無効です');
        }

        if (!this.PATTERNS.EMOTION.test(emotion)) {
            throw new Error('感情パラメータの形式が無効です');
        }

        return emotion.trim();
    }

    /**
     * Validate and sanitize text input
     * @param {string} text - Text to validate
     * @returns {string} Sanitized text
     * @throws {Error} If validation fails
     */
    static validateText(text) {
        if (!text || typeof text !== 'string') {
            throw new Error('テキストが無効です');
        }

        const trimmedText = text.trim();
        if (trimmedText.length === 0) {
            throw new Error('テキストが空です');
        }

        if (trimmedText.length > CONFIG.TEXT_LIMITS.MAX_LENGTH) {
            throw new Error(`テキストが長すぎます（最大${CONFIG.TEXT_LIMITS.MAX_LENGTH}文字）`);
        }

        // Security checks
        this._checkForDangerousContent(trimmedText, 'テキスト');

        return trimmedText;
    }

    /**
     * Validate numeric parameter with range checking
     * @param {any} value - Value to validate
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @param {string} paramName - Parameter name for error messages
     * @returns {number} Validated numeric value
     * @throws {Error} If validation fails
     */
    static validateNumericParam(value, min, max, paramName) {
        if (value === null || value === undefined) {
            throw new Error(`${paramName}が指定されていません`);
        }
        
        // Security checks for string inputs
        if (typeof value === 'string') {
            this._checkForSecurityThreats(value, paramName);
        }
        
        const numericValue = Number(value);
        
        if (!this._isValidNumber(numericValue)) {
            throw new Error(`${paramName}は有効な数値である必要があります`);
        }

        if (numericValue < min || numericValue > max) {
            throw new Error(`${paramName}は${min}から${max}の間である必要があります`);
        }

        return numericValue;
    }

    /**
     * Secure command execution with array-based arguments
     * @param {string} command - Command to execute
     * @param {string[]} args - Command arguments array
     * @param {object} options - Execution options
     * @returns {Promise<string|Buffer>} Execution result
     */
    static async safeExec(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const isBinary = options.encoding === 'buffer';
            if (isBinary) delete options.encoding;
            
            const child = spawn(command, args, {
                ...options,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = isBinary ? [] : '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                if (isBinary) {
                    stdout.push(data);
                } else {
                    stdout += data.toString();
                }
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`コマンド実行エラー (終了コード: ${code}): ${stderr}`));
                } else {
                    resolve(isBinary ? Buffer.concat(stdout) : stdout.trim());
                }
            });

            child.on('error', (error) => {
                reject(new Error(`コマンド実行失敗: ${error.message}`));
            });

            // Use configurable timeout
            setTimeout(() => {
                child.kill();
                reject(new Error('コマンド実行がタイムアウトしました'));
            }, CONFIG.TIMEOUTS.COMMAND_EXECUTION);
        });
    }

    /**
     * Validate file path against directory traversal attacks
     * @param {string} filePath - File path to validate
     * @param {string} allowedDir - Allowed base directory
     * @returns {string} Normalized and validated path
     * @throws {Error} If path is invalid or dangerous
     */
    static validateFilePath(filePath, allowedDir) {
        const normalizedPath = path.normalize(filePath);
        const normalizedAllowedDir = path.normalize(allowedDir);

        if (!normalizedPath.startsWith(normalizedAllowedDir)) {
            throw new Error('不正なファイルパスです');
        }

        if (/[<>:"|?*]/.test(normalizedPath)) {
            throw new Error('ファイルパスに不正な文字が含まれています');
        }

        return normalizedPath;
    }

    /**
     * Check rate limits for IP addresses
     * @param {string} ip - Client IP address
     * @param {number} maxRequests - Maximum requests allowed
     * @param {number} windowMs - Time window in milliseconds
     * @throws {Error} If rate limit is exceeded
     */
    static checkRateLimit(ip, maxRequests = CONFIG.RATE_LIMIT.GET_REQUESTS, windowMs = CONFIG.RATE_LIMIT.WINDOW_MS) {
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!this.rateLimiter.has(ip)) {
            this.rateLimiter.set(ip, []);
        }

        const requests = this.rateLimiter.get(ip);
        const validRequests = requests.filter(time => time > windowStart);
        
        if (validRequests.length >= maxRequests) {
            throw new Error('リクエスト制限に達しました。しばらく待ってから再試行してください。');
        }

        validRequests.push(now);
        this.rateLimiter.set(ip, validRequests);
    }

    // Private helper methods

    /**
     * Check for dangerous content in text
     * @private
     */
    static _checkForDangerousContent(text, context) {
        if (this.PATTERNS.DANGEROUS_CHARS.test(text)) {
            throw new Error(`${context}に不正な文字が含まれています`);
        }
        
        if (this.PATTERNS.CONTROL_CHARS.test(text)) {
            throw new Error(`${context}に制御文字が含まれています`);
        }

        if (this.PATTERNS.HTML_TAGS.test(text)) {
            throw new Error(`${context}にHTMLタグが含まれています`);
        }

        if (this.PATTERNS.JAVASCRIPT.test(text)) {
            throw new Error(`${context}にJavaScriptが含まれています`);
        }
    }

    /**
     * Check for security threats in string inputs
     * @private
     */
    static _checkForSecurityThreats(value, paramName) {
        if (this.PATTERNS.SQL_INJECTION.test(value) || this.PATTERNS.SQL_KEYWORDS.test(value)) {
            throw new Error(`${paramName}にSQLインジェクションの疑いがある文字が含まれています`);
        }
        
        if (this.PATTERNS.COMMAND_INJECTION.test(value)) {
            throw new Error(`${paramName}にコマンドインジェクションの疑いがある文字が含まれています`);
        }
        
        if (this.PATTERNS.CONTROL_CHARS.test(value)) {
            throw new Error(`${paramName}に制御文字が含まれています`);
        }
    }

    /**
     * Check if a number is valid and finite
     * @private
     */
    static _isValidNumber(num) {
        return !isNaN(num) && isFinite(num);
    }
}