/**
 * VoiceVox Engine compatibility adapter
 * Provides seamless integration with VoiceVox Engine API
 */
import axios from 'axios';
import { Logger } from './utils/logger.js';

/**
 * VoiceVox Engine adapter class
 */
export class VoiceVoxAdapter {
    constructor() {
        this.baseURL = process.env.VOICEVOX_ENGINE_URL;
        
        if (!this.baseURL) {
            throw new Error('VOICEVOX_ENGINE_URL environment variable is required');
        }
        
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        Logger.info(`VoiceVox Adapter初期化: ${this.baseURL}`);
    }

    /**
     * Get narrators list (speakers converted to narrator format)
     * @returns {Promise<object>} Narrators object
     */
    async getNarrators() {
        try {
            const speakers = await this._getSpeakers();
            const narrators = [...new Set(speakers.map(speaker => speaker.name))];
            return { narrators };
        } catch (error) {
            throw this._createError('ナレーター一覧取得', error);
        }
    }

    /**
     * Get emotions for specified narrator
     * @param {string} narratorName - Narrator name
     * @returns {Promise<object>} Emotions object
     */
    async getEmotions(narratorName) {
        try {
            const speakers = await this._getSpeakers();
            const targetSpeaker = speakers.find(speaker => speaker.name === narratorName);
            
            if (!targetSpeaker) {
                throw new Error(`ナレーター "${narratorName}" が見つかりません`);
            }
            
            const emotions = targetSpeaker.styles.map(style => style.name);
            return { emotions, narrator: narratorName };
        } catch (error) {
            throw this._createError('感情一覧取得', error);
        }
    }

    /**
     * Get default emotions (from first available speaker)
     * @returns {Promise<object>} Default emotions object
     */
    async getDefaultEmotions() {
        try {
            const speakers = await this._getSpeakers();
            
            if (speakers.length === 0) {
                throw new Error('利用可能なスピーカーが見つかりません');
            }
            
            const defaultSpeaker = speakers[0];
            const emotions = defaultSpeaker.styles.map(style => style.name);
            return { emotions, narrator: defaultSpeaker.name };
        } catch (error) {
            throw this._createError('デフォルト感情一覧取得', error);
        }
    }

    /**
     * Perform text-to-speech synthesis using VoiceVox API
     * @param {object} params - Synthesis parameters
     * @param {string} params.text - Text to synthesize
     * @param {string} params.narrator - Narrator name
     * @param {string} params.emotion - Emotion name
     * @param {number} params.speed - Speech speed (50-200)
     * @param {number} params.pitch - Pitch adjustment (-50 to 50)
     * @returns {Promise<Buffer>} Audio buffer
     */
    async synthesize({ text, narrator, emotion, speed = 100, pitch = 0 }) {
        try {
            Logger.info(`VoiceVox 音声合成: "${text}" (${narrator}, ${emotion})`);
            
            // Get speaker ID from narrator and emotion
            const speakerId = await this._getSpeakerId(narrator, emotion);
            
            // Create audio query
            const audioQuery = await this._createAudioQuery(text, speakerId);
            
            // Adjust parameters
            this._adjustAudioQueryParameters(audioQuery, speed, pitch);
            
            // Perform synthesis
            return await this._performSynthesis(audioQuery, speakerId);
            
        } catch (error) {
            throw this._createError('音声合成', error);
        }
    }

    /**
     * Create audio query for given text and speaker
     * @param {string} text - Text to process
     * @param {number} speakerId - Speaker ID
     * @param {object} options - Additional options
     * @returns {Promise<object>} Audio query object
     */
    async createAudioQuery(text, speakerId, options = {}) {
        try {
            Logger.info(`VoiceVox オーディオクエリ作成: "${text}" (speakerId: ${speakerId})`);
            
            const processedText = this._preprocessText(text);
            
            const response = await this.client.post('/audio_query', null, {
                params: {
                    text: processedText,
                    speaker: speakerId
                }
            });
            
            const audioQuery = this._enhanceAudioQuery(response.data, options);
            
            Logger.info(`オーディオクエリ作成成功: アクセント句数 ${audioQuery.accent_phrases.length}`);
            return audioQuery;
            
        } catch (error) {
            throw this._handleApiError(error, 'オーディオクエリ作成');
        }
    }

    // Private helper methods

    /**
     * Get speakers list from VoiceVox API
     * @private
     */
    async _getSpeakers() {
        const response = await this.client.get('/speakers');
        return response.data;
    }

    /**
     * Get speaker ID from narrator and emotion names
     * @private
     */
    async _getSpeakerId(narratorName, emotionName) {
        const speakers = await this._getSpeakers();
        
        const targetSpeaker = narratorName 
            ? speakers.find(s => s.name === narratorName)
            : speakers[0];
        
        if (!targetSpeaker) {
            const errorMsg = narratorName 
                ? `ナレーター "${narratorName}" が見つかりません`
                : '利用可能なスピーカーが見つかりません';
            throw new Error(errorMsg);
        }
        
        let targetStyle = targetSpeaker.styles[0]; // Default style
        
        if (emotionName) {
            const foundStyle = targetSpeaker.styles.find(style => style.name === emotionName);
            if (foundStyle) {
                targetStyle = foundStyle;
            } else {
                Logger.warn(`感情 "${emotionName}" が見つからないため、デフォルトスタイル "${targetStyle.name}" を使用`);
            }
        }
        
        return targetStyle.id;
    }

    /**
     * Create audio query with validated parameters
     * @private
     */
    async _createAudioQuery(text, speakerId) {
        const processedText = this._preprocessText(text);
        
        const response = await this.client.post('/audio_query', null, {
            params: {
                text: processedText,
                speaker: speakerId
            }
        });
        
        return response.data;
    }

    /**
     * Preprocess text for synthesis
     * @private
     */
    _preprocessText(text) {
        if (!text || typeof text !== 'string') {
            throw new Error('有効なテキストが必要です');
        }
        
        let processed = text.trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control chars
        
        if (processed.length > 1000) {
            Logger.warn(`警告: テキストが長すぎます (${processed.length}文字)`);
        }
        
        return processed;
    }

    /**
     * Enhance audio query with default values and options
     * @private
     */
    _enhanceAudioQuery(audioQuery, options) {
        return {
            accent_phrases: audioQuery.accent_phrases || [],
            speedScale: audioQuery.speedScale || 1.0,
            pitchScale: audioQuery.pitchScale || 0.0,
            intonationScale: audioQuery.intonationScale || 1.0,
            volumeScale: audioQuery.volumeScale || 1.0,
            prePhonemeLength: audioQuery.prePhonemeLength || 0.1,
            postPhonemeLength: audioQuery.postPhonemeLength || 0.1,
            outputSamplingRate: audioQuery.outputSamplingRate || 24000,
            outputStereo: audioQuery.outputStereo || false,
            kana: audioQuery.kana || '',
            ...options
        };
    }

    /**
     * Adjust audio query parameters for speed and pitch
     * @private
     */
    _adjustAudioQueryParameters(audioQuery, speed, pitch) {
        audioQuery.speedScale = speed / 100.0;
        audioQuery.pitchScale = pitch / 50.0;
        return audioQuery;
    }

    /**
     * Perform synthesis with validated audio query
     * @private
     */
    async _performSynthesis(audioQuery, speakerId) {
        const response = await this.client.post('/synthesis', audioQuery, {
            params: { speaker: speakerId },
            responseType: 'arraybuffer'
        });
        
        return Buffer.from(response.data);
    }

    /**
     * Handle API errors with context
     * @private
     */
    _handleApiError(error, context) {
        if (error.response) {
            const status = error.response.status;
            const detail = error.response.data?.detail || error.response.statusText;
            
            switch (status) {
                case 422:
                    return new Error(`テキスト処理エラー: ${detail}`);
                case 404:
                    return new Error(`リソースが見つかりません: ${detail}`);
                default:
                    return new Error(`VoiceVox API エラー (${status}): ${detail}`);
            }
        } else if (error.code === 'ECONNREFUSED') {
            return new Error('VoiceVox Engine への接続に失敗しました');
        } else {
            return new Error(`${context}失敗: ${error.message}`);
        }
    }

    /**
     * Create standardized error with context
     * @private
     */
    _createError(context, originalError) {
        return new Error(`VoiceVox での${context}に失敗: ${originalError.message}`);
    }
}