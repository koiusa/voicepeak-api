/**
 * Voicepeak API routes
 * Handles narrator listing, emotion management, and text-to-speech synthesis
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SecurityUtils } from '../security.js';
import { Logger } from '../utils/logger.js';
import { ResponseFormatter } from '../utils/response-formatter.js';
import { CONFIG } from '../config/constants.js';

const router = express.Router();

/**
 * Initialize Voicepeak API routes
 * @param {string} voicepeakPath - Path to Voicepeak binary
 * @param {string} voicepeakDir - Voicepeak directory  
 * @param {string} tempDir - Temporary files directory
 * @param {number} rateLimitGetRequests - GET request rate limit
 * @param {number} rateLimitPostRequests - POST request rate limit
 * @param {number} rateLimitWindowMs - Rate limit window in milliseconds
 * @returns {object} Configured router
 */
export function createVoicepeakRoutes(voicepeakPath, voicepeakDir, tempDir, rateLimitGetRequests, rateLimitPostRequests, rateLimitWindowMs) {

    /**
     * GET /api/narrators - Get available narrators list
     */
    router.get('/narrators', async (req, res) => {
        try {
            const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
            SecurityUtils.checkRateLimit(clientIp, rateLimitGetRequests, rateLimitWindowMs);
            
            Logger.info('ナレーター一覧要求');
            
            const result = await SecurityUtils.safeExec(voicepeakPath, [
                '--list-narrator'
            ], { cwd: voicepeakDir });
            
            const narrators = result
                .split('\n')
                .filter(line => line.trim() && !line.includes('UserApplication'));
            
            Logger.info(`取得したナレーター: ${narrators.join(', ')}`);
            ResponseFormatter.sendSuccessResponse(res, { narrators });
            
        } catch (error) {
            const errorResponse = ResponseFormatter.handleValidationError(error, 'ナレーター一覧取得');
            ResponseFormatter.sendErrorResponse(res, errorResponse);
        }
    });

    /**
     * GET /api/emotions - Get default narrator emotions list
     */
    router.get('/emotions', async (req, res) => {
        try {
            const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
            SecurityUtils.checkRateLimit(clientIp, rateLimitGetRequests, rateLimitWindowMs);
            
            Logger.info('デフォルト感情一覧要求');
            
            const defaultNarrator = CONFIG.DEFAULTS.NARRATOR;
            Logger.info(`感情一覧要求 - デフォルトナレーター: ${defaultNarrator}`);
            
            const result = await SecurityUtils.safeExec(voicepeakPath, [
                '--list-emotion',
                defaultNarrator
            ], { cwd: voicepeakDir });
            
            const emotions = result
                .split('\n')
                .filter(line => line.trim() && !line.includes('UserApplication'));
            
            Logger.info(`取得した感情 (${defaultNarrator}): ${emotions.join(', ')}`);
            ResponseFormatter.sendSuccessResponse(res, { emotions, narrator: defaultNarrator });
            
        } catch (error) {
            const errorResponse = ResponseFormatter.handleValidationError(error, '感情一覧取得');
            ResponseFormatter.sendErrorResponse(res, errorResponse);
        }
    });

    /**
     * GET /api/emotions/:narrator - Get emotions for specific narrator
     */
    router.get('/emotions/:narrator', async (req, res) => {
        try {
            const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
            SecurityUtils.checkRateLimit(clientIp, rateLimitGetRequests, rateLimitWindowMs);
            
            const narrator = SecurityUtils.validateNarrator(req.params.narrator);
            Logger.info(`感情一覧要求 - ${narrator}`);
            
            const result = await SecurityUtils.safeExec(voicepeakPath, [
                '--list-emotion',
                narrator
            ], { cwd: voicepeakDir });
            
            const emotions = result
                .split('\n')
                .filter(line => line.trim() && !line.includes('UserApplication'));
            
            Logger.info(`取得した感情 (${narrator}): ${emotions.join(', ')}`);
            ResponseFormatter.sendSuccessResponse(res, { emotions });
            
        } catch (error) {
            const errorResponse = ResponseFormatter.handleValidationError(error, '感情一覧取得');
            ResponseFormatter.sendErrorResponse(res, errorResponse);
        }
    });

    /**
     * POST /api/synthesize - Text-to-speech synthesis
     */
    router.post('/synthesize', async (req, res) => {
        try {
            const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
            SecurityUtils.checkRateLimit(clientIp, rateLimitPostRequests, rateLimitWindowMs);
            
            const { 
                text, 
                narrator = CONFIG.DEFAULTS.NARRATOR, 
                emotion = CONFIG.DEFAULTS.EMOTION, 
                speed = CONFIG.AUDIO_PARAMS.SPEED.DEFAULT, 
                pitch = CONFIG.AUDIO_PARAMS.PITCH.DEFAULT 
            } = req.body;
            
            // Validate all parameters using SecurityUtils
            const validatedText = SecurityUtils.validateText(text);
            const validatedNarrator = SecurityUtils.validateNarrator(narrator);
            const validatedEmotion = SecurityUtils.validateEmotion(emotion);
            const validatedSpeed = SecurityUtils.validateNumericParam(
                speed, 
                CONFIG.AUDIO_PARAMS.SPEED.MIN, 
                CONFIG.AUDIO_PARAMS.SPEED.MAX, 
                'スピード'
            );
            const validatedPitch = SecurityUtils.validateNumericParam(
                pitch, 
                CONFIG.AUDIO_PARAMS.PITCH.MIN, 
                CONFIG.AUDIO_PARAMS.PITCH.MAX, 
                'ピッチ'
            );
            
            Logger.info(`音声合成リクエスト: "${validatedText}" (${validatedNarrator}, ${validatedEmotion})`);
            Logger.info('Voicepeak を使用して音声合成実行');
            
            // Generate unique output file
            const outputId = uuidv4();
            const outputPath = SecurityUtils.validateFilePath(
                path.join(tempDir, `${outputId}.wav`), 
                tempDir
            );
            
            // Prepare Voicepeak command arguments
            const emotionParam = validatedEmotion.includes('=') 
                ? validatedEmotion 
                : `${validatedEmotion}=${CONFIG.AUDIO_PARAMS.EMOTION_DEFAULT_VALUE}`;
            
            const args = [
                '--say', validatedText,
                '--out', outputPath,
                '--narrator', validatedNarrator,
                '--emotion', emotionParam
            ];
            
            if (validatedSpeed !== CONFIG.AUDIO_PARAMS.SPEED.DEFAULT) {
                args.push('--speed', validatedSpeed.toString());
            }
            if (validatedPitch !== CONFIG.AUDIO_PARAMS.PITCH.DEFAULT) {
                args.push('--pitch', validatedPitch.toString());
            }
            
            Logger.info(`Voicepeakコマンド実行: ${voicepeakPath} ${args.join(' ')}`);
            await SecurityUtils.safeExec(voicepeakPath, args, { cwd: voicepeakDir });
            
            if (!fs.existsSync(outputPath)) {
                throw new Error('音声ファイルが生成されませんでした');
            }
            
            // Send audio file and clean up
            const wavBuffer = fs.readFileSync(outputPath);
            ResponseFormatter.sendBinaryResponse(res, wavBuffer, `voice_${outputId}.wav`);
            
            // Async cleanup
            fs.unlink(outputPath, (err) => {
                if (err) {
                    Logger.error('一時ファイル削除エラー:', err.message);
                } else {
                    Logger.info(`一時ファイル削除: ${outputPath}`);
                }
            });
            
        } catch (error) {
            const errorResponse = ResponseFormatter.handleValidationError(error, '音声合成');
            ResponseFormatter.sendErrorResponse(res, errorResponse);
        }
    });

    return router;
}