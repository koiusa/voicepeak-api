/**
 * VoiceVox compatibility API routes
 * Provides VoiceVox-compatible endpoints using Voicepeak as the backend
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SecurityUtils } from '../security.js';
import { Logger } from '../utils/logger.js';
import { ResponseFormatter } from '../utils/response-formatter.js';
import { SpeakerIdUtils } from '../utils/speaker-id-utils.js';

const router = express.Router();

/**
 * Initialize VoiceVox compatibility routes
 * @param {string} voicepeakPath - Path to Voicepeak binary
 * @param {string} voicepeakDir - Voicepeak directory
 * @param {string} tempDir - Temporary files directory
 * @param {number} rateLimitGetRequests - GET request rate limit
 * @param {number} rateLimitPostRequests - POST request rate limit
 * @param {number} rateLimitWindowMs - Rate limit window in milliseconds
 * @returns {object} Configured router
 */
export function createVoiceVoxRoutes(voicepeakPath, voicepeakDir, tempDir, rateLimitGetRequests, rateLimitPostRequests, rateLimitWindowMs) {

    /**
     * GET /speakers - VoiceVox compatible speakers list
     */
    router.get('/speakers', async (req, res) => {
        try {
            const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
            SecurityUtils.checkRateLimit(clientIp, rateLimitGetRequests, rateLimitWindowMs);
            
            Logger.info('VoiceVox互換: スピーカー一覧要求');
            
            const speakers = await SpeakerIdUtils.generateVoiceVoxSpeakersList(voicepeakPath, voicepeakDir);
            
            Logger.info(`VoiceVox互換スピーカー形式に変換完了: ${speakers.length}件`);
            ResponseFormatter.sendSuccessResponse(res, speakers);
            
        } catch (error) {
            const errorResponse = ResponseFormatter.createVoiceVoxCompatibilityError(error, 'スピーカー一覧取得');
            ResponseFormatter.sendErrorResponse(res, errorResponse);
        }
    });

    /**
     * POST /audio_query - Create VoiceVox compatible audio query
     */
    router.post('/audio_query', async (req, res) => {
        try {
            const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
            SecurityUtils.checkRateLimit(clientIp, rateLimitPostRequests, rateLimitWindowMs);
            
            Logger.debug('audio_query リクエスト:');
            Logger.debug('  クエリパラメータ:', req.query);
            Logger.debug('  ヘッダー:', req.headers);
            
            // Support both query parameters and body
            const text = req.query?.text || req.body?.text;
            const speaker = req.query?.speaker || req.body?.speaker;

            // Validate required parameters
            if (!text) {
                const errorResponse = ResponseFormatter.createErrorResponse(
                    422, 'body', 'text', 'textパラメータが必要です', 'missing'
                );
                return ResponseFormatter.sendErrorResponse(res, errorResponse);
            }
            
            if (!speaker) {
                const errorResponse = ResponseFormatter.createErrorResponse(
                    422, 'body', 'speaker', 'speakerパラメータが必要です', 'missing'
                );
                return ResponseFormatter.sendErrorResponse(res, errorResponse);
            }
            
            // Validate and sanitize inputs
            const validatedText = SecurityUtils.validateText(text);
            const speakerId = SpeakerIdUtils.validateSpeakerId(speaker);
            
            Logger.info(`VoiceVox互換: オーディオクエリ作成 - "${validatedText}" (speaker: ${speakerId})`);
            
            // Find narrator info by speaker ID
            const narratorInfo = await SpeakerIdUtils.findNarratorByStyleId(speakerId, voicepeakPath, voicepeakDir);
            if (!narratorInfo) {
                const errorResponse = ResponseFormatter.createErrorResponse(
                    422, 'body', 'speaker', '指定されたスピーカーIDが見つかりません', 'value_error'
                );
                return ResponseFormatter.sendErrorResponse(res, errorResponse);
            }
            
            Logger.info(`ナレーター情報: ${narratorInfo.narrator} - ${narratorInfo.emotion}`);
            
            // Generate VoiceVox compatible audio query
            const audioQuery = generateAudioQuery(validatedText);
            
            Logger.info(`オーディオクエリ作成成功: サンプリング周波数 ${audioQuery.outputSamplingRate}Hz`);
            ResponseFormatter.sendSuccessResponse(res, audioQuery);
            
        } catch (error) {
            const errorResponse = ResponseFormatter.createVoiceVoxCompatibilityError(error, 'オーディオクエリ作成');
            ResponseFormatter.sendErrorResponse(res, errorResponse);
        }
    });

    /**
     * POST /synthesis - VoiceVox compatible synthesis
     */
    router.post('/synthesis', async (req, res) => {
        try {
            const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
            SecurityUtils.checkRateLimit(clientIp, rateLimitPostRequests, rateLimitWindowMs);
            
            const audioQuery = req.body;
            const { speaker } = req.query;
            
            // Validate required parameters
            if (!audioQuery) {
                const errorResponse = ResponseFormatter.createErrorResponse(
                    422, 'body', '', 'オーディオクエリが必要です', 'missing'
                );
                return ResponseFormatter.sendErrorResponse(res, errorResponse);
            }
            
            if (!speaker) {
                const errorResponse = ResponseFormatter.createErrorResponse(
                    422, 'query', 'speaker', 'speakerパラメータが必要です', 'missing'
                );
                return ResponseFormatter.sendErrorResponse(res, errorResponse);
            }
            
            const speakerId = SpeakerIdUtils.validateSpeakerId(speaker);
            Logger.info(`VoiceVox互換: 音声合成実行 (speaker: ${speaker})`);
            
            // Find narrator info
            const narratorInfo = await SpeakerIdUtils.findNarratorByStyleId(speakerId, voicepeakPath, voicepeakDir);
            if (!narratorInfo) {
                const errorResponse = ResponseFormatter.createErrorResponse(
                    422, 'query', 'speaker', '指定されたスピーカーIDが見つかりません', 'value_error'
                );
                return ResponseFormatter.sendErrorResponse(res, errorResponse);
            }
            
            // Extract text and parameters from audio query
            const { text, speed, pitch } = extractSynthesisParameters(audioQuery);
            
            if (!text) {
                const errorResponse = ResponseFormatter.createErrorResponse(
                    422, 'body', 'kana', 'テキストが見つかりません', 'value_error'
                );
                return ResponseFormatter.sendErrorResponse(res, errorResponse);
            }
            
            const validatedText = SecurityUtils.validateText(text);
            
            // Perform synthesis using Voicepeak
            Logger.info(`Voicepeak音声合成: "${validatedText}" (${narratorInfo.narrator}, ${narratorInfo.emotion})`);
            
            const outputId = uuidv4();
            const outputPath = SecurityUtils.validateFilePath(
                path.join(tempDir, `${outputId}.wav`), 
                tempDir
            );
            
            const emotionParam = SpeakerIdUtils.formatEmotionParameter(narratorInfo.emotion);
            const args = [
                '--say', validatedText,
                '--out', outputPath,
                '--narrator', narratorInfo.narrator,
                '--emotion', emotionParam
            ];
            
            if (speed !== 100) {
                args.push('--speed', speed.toString());
            }
            if (pitch !== 0) {
                args.push('--pitch', pitch.toString());
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
            const errorResponse = ResponseFormatter.createVoiceVoxCompatibilityError(error, '音声合成');
            ResponseFormatter.sendErrorResponse(res, errorResponse);
        }
    });

    return router;
}

/**
 * Generate VoiceVox compatible audio query structure
 * @param {string} text - Input text
 * @returns {object} Audio query object
 */
function generateAudioQuery(text) {
    return {
        accent_phrases: [
            {
                moras: text.split('').map((char, index) => ({
                    text: char,
                    consonant: null,
                    consonant_length: 0,
                    vowel: char,
                    vowel_length: 0.1,
                    pitch: 5.0
                })),
                accent: 1,
                pause_mora: null,
                is_interrogative: text.includes('？') || text.includes('?')
            }
        ],
        speedScale: 1.0,
        pitchScale: 0.0,
        intonationScale: 1.0,
        tempoDynamicsScale: 1.0,
        volumeScale: 1.0,
        prePhonemeLength: 0.1,
        postPhonemeLength: 0.1,
        pauseLength: 0.8,
        pauseLengthScale: 1.0,
        outputSamplingRate: 24000,
        outputStereo: false,
        kana: text
    };
}

/**
 * Extract synthesis parameters from audio query
 * @param {object} audioQuery - VoiceVox audio query object
 * @returns {object} Extracted parameters
 */
function extractSynthesisParameters(audioQuery) {
    let text = '';
    let speed = 100;
    let pitch = 0;
    
    // Check for simple request format (text field)
    if (audioQuery.text) {
        text = audioQuery.text;
        speed = audioQuery.speed || 100;
        pitch = audioQuery.pitch || 0;
        
        // Validate parameter ranges
        if (speed < 50 || speed > 200) {
            throw new Error('スピードは50から200の間である必要があります');
        }
        
        if (pitch < -50 || pitch > 50) {
            throw new Error('ピッチは-50から50の間である必要があります');
        }
    } else {
        // Standard audio query format
        text = audioQuery.kana || '';
        if (!text && audioQuery.accent_phrases && audioQuery.accent_phrases.length > 0) {
            // Reconstruct text from accent_phrases
            text = audioQuery.accent_phrases
                .map(phrase => phrase.moras.map(mora => mora.text).join(''))
                .join('');
        }
        
        // Convert audio query parameters to Voicepeak parameters
        speed = Math.round((audioQuery.speedScale || 1.0) * 100);
        pitch = Math.round((audioQuery.pitchScale || 0.0) * 50);
    }
    
    return { text, speed, pitch };
}