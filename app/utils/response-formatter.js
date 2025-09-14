/**
 * Standardized response formatting utilities
 * Eliminates duplicate error handling patterns across the API
 */
import { Logger } from './logger.js';

/**
 * Standard error response formats for consistent API responses
 */
export class ResponseFormatter {
    
    /**
     * Create standardized error response
     * @param {number} statusCode - HTTP status code
     * @param {string} location - Error location (e.g., 'body', 'query', 'path')
     * @param {string} field - Field name where error occurred
     * @param {string} message - Error message
     * @param {string} type - Error type (e.g., 'value_error', 'missing', 'rate_limit')
     * @returns {object} Formatted error response
     */
    static createErrorResponse(statusCode, location, field, message, type) {
        return {
            statusCode,
            detail: [{
                loc: [location, field],
                msg: message,
                type: type
            }]
        };
    }

    /**
     * Create multiple error response
     * @param {number} statusCode - HTTP status code
     * @param {Array} errors - Array of error objects
     * @returns {object} Formatted error response
     */
    static createMultipleErrorResponse(statusCode, errors) {
        return {
            statusCode,
            detail: errors
        };
    }

    /**
     * Handle and format validation errors
     * @param {Error} error - Validation error
     * @param {string} context - Context where error occurred
     * @returns {object} Formatted error response
     */
    static handleValidationError(error, context = 'validation') {
        Logger.error(`${context} error:`, error.message);

        if (error.message.includes('リクエスト制限')) {
            return this.createErrorResponse(429, 'request', '', 'リクエスト制限に達しました', 'rate_limit');
        }

        if (error.message.includes('テキスト')) {
            return this.createErrorResponse(422, 'body', 'text', '無効なテキストです', 'value_error');
        }

        if (error.message.includes('ナレーター名')) {
            return this.createErrorResponse(422, 'body', 'narrator', '無効なナレーター名です', 'value_error');
        }

        if (error.message.includes('感情')) {
            return this.createErrorResponse(422, 'body', 'emotion', '無効な感情パラメータです', 'value_error');
        }

        if (error.message.includes('数値') || error.message.includes('スピード') || error.message.includes('ピッチ')) {
            return this.createErrorResponse(422, 'body', 'speed', '無効な数値パラメータです', 'value_error');
        }

        if (error.message.includes('許可されていない文字') || error.message.includes('不正な文字')) {
            return this.createErrorResponse(422, 'body', 'text', '許可されていない文字が含まれています', 'value_error');
        }

        if (error.message.includes('ファイルパス')) {
            return this.createErrorResponse(500, 'internal', '', 'ファイルパスエラーが発生しました', 'internal_error');
        }

        if (error.message.includes('音声ファイルが生成されませんでした')) {
            return this.createErrorResponse(500, 'synthesis', '', 'Voicepeakが音声ファイルを生成できませんでした。パラメータを確認してください。', 'synthesis_error');
        }

        // Default internal server error
        return this.createErrorResponse(500, 'internal', '', '内部サーバーエラーが発生しました', 'internal_error');
    }

    /**
     * Send formatted error response
     * @param {object} res - Express response object
     * @param {object} errorResponse - Formatted error response
     */
    static sendErrorResponse(res, errorResponse) {
        res.status(errorResponse.statusCode).json({
            detail: errorResponse.detail
        });
    }

    /**
     * Send success response with optional data
     * @param {object} res - Express response object
     * @param {object} data - Response data
     * @param {number} statusCode - HTTP status code (default: 200)
     */
    static sendSuccessResponse(res, data, statusCode = 200) {
        res.status(statusCode).json(data);
    }

    /**
     * Send binary file response (for audio files)
     * @param {object} res - Express response object
     * @param {Buffer} buffer - File buffer
     * @param {string} filename - File name
     * @param {string} contentType - MIME type
     */
    static sendBinaryResponse(res, buffer, filename, contentType = 'audio/wav') {
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(buffer);
    }

    /**
     * Common error patterns for VoiceVox compatibility
     */
    static createVoiceVoxCompatibilityError(error, context) {
        Logger.error(`VoiceVox互換: ${context}エラー:`, error.message);

        if (error.message.includes('リクエスト制限')) {
            return this.createErrorResponse(429, 'request', '', 'リクエスト制限に達しました', 'rate_limit');
        }

        if (error.message.includes('スピーカー')) {
            return this.createErrorResponse(422, 'body', 'speaker', '無効なスピーカーIDです', 'value_error');
        }

        return this.handleValidationError(error, context);
    }
}