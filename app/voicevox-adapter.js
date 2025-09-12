import axios from 'axios';

/**
 * VoiceVox Engine との互換性を提供するアダプター
 */
export class VoiceVoxAdapter {
    constructor() {
        // 環境変数からURLを取得（必須）
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
        console.log(`VoiceVox Adapter初期化: ${this.baseURL}`);
    }

    /**
     * スピーカー一覧を取得してナレーター形式に変換
     */
    async getNarrators() {
        try {
            const response = await this.client.get('/speakers');
            const speakers = response.data;
            
            // スピーカー名の一覧を抽出（重複除去）
            const narrators = [...new Set(speakers.map(speaker => speaker.name))];
            
            return { narrators };
        } catch (error) {
            throw new Error(`VoiceVox からのナレーター一覧取得に失敗: ${error.message}`);
        }
    }

    /**
     * 指定されたナレーターの感情一覧を取得
     */
    async getEmotions(narratorName) {
        try {
            const response = await this.client.get('/speakers');
            const speakers = response.data;
            
            // ナレーター名で検索
            const targetSpeaker = speakers.find(speaker => speaker.name === narratorName);
            if (!targetSpeaker) {
                throw new Error(`ナレーター "${narratorName}" が見つかりません`);
            }
            
            // スタイル名を感情として抽出
            const emotions = targetSpeaker.styles.map(style => style.name);
            
            return { emotions, narrator: narratorName };
        } catch (error) {
            throw new Error(`VoiceVox からの感情一覧取得に失敗: ${error.message}`);
        }
    }

    /**
     * デフォルトの感情一覧を取得（最初のスピーカーから）
     */
    async getDefaultEmotions() {
        try {
            const response = await this.client.get('/speakers');
            const speakers = response.data;
            
            if (speakers.length === 0) {
                throw new Error('利用可能なスピーカーが見つかりません');
            }
            
            const defaultSpeaker = speakers[0];
            const emotions = defaultSpeaker.styles.map(style => style.name);
            
            return { emotions, narrator: defaultSpeaker.name };
        } catch (error) {
            throw new Error(`VoiceVox からのデフォルト感情一覧取得に失敗: ${error.message}`);
        }
    }

    /**
     * VoiceVox API を使用して音声合成を実行
     */
    async synthesize({ text, narrator, emotion, speed = 100, pitch = 0 }) {
        try {
            console.log(`VoiceVox 音声合成: "${text}" (${narrator}, ${emotion})`);
            
            // 1. ナレーターと感情からスピーカーIDを取得
            const speakerId = await this.getSpeakerId(narrator, emotion);
            
            // 2. オーディオクエリを作成
            const audioQuery = await this.createAudioQuery(text, speakerId);
            
            // 3. 速度とピッチを調整
            this.adjustAudioQuery(audioQuery, speed, pitch);
            
            // 4. 音声合成を実行
            const audioBuffer = await this.performSynthesis(audioQuery, speakerId);
            
            return audioBuffer;
            
        } catch (error) {
            throw new Error(`VoiceVox での音声合成に失敗: ${error.message}`);
        }
    }

    /**
     * ナレーター名と感情からスピーカーIDを取得
     */
    async getSpeakerId(narratorName, emotionName) {
        const response = await this.client.get('/speakers');
        const speakers = response.data;
        
        let targetSpeaker = null;
        
        if (narratorName) {
            targetSpeaker = speakers.find(s => s.name === narratorName);
            if (!targetSpeaker) {
                throw new Error(`ナレーター "${narratorName}" が見つかりません`);
            }
        } else {
            // デフォルトスピーカーを使用
            targetSpeaker = speakers[0];
            if (!targetSpeaker) {
                throw new Error('利用可能なスピーカーが見つかりません');
            }
        }
        
        // 感情（スタイル）を検索
        let targetStyle = null;
        if (emotionName) {
            targetStyle = targetSpeaker.styles.find(style => style.name === emotionName);
            if (!targetStyle) {
                // 感情が見つからない場合はデフォルトスタイルを使用
                targetStyle = targetSpeaker.styles[0];
                console.warn(`感情 "${emotionName}" が見つからないため、デフォルトスタイル "${targetStyle.name}" を使用`);
            }
        } else {
            // デフォルトスタイルを使用
            targetStyle = targetSpeaker.styles[0];
        }
        
        return targetStyle.id;
    }

    /**
     * オーディオクエリを作成
     */
    async createAudioQuery(text, speakerId, options = {}) {
        try {
            console.log(`VoiceVox オーディオクエリ作成: "${text}" (speakerId: ${speakerId})`);
            
            // テキストの前処理
            const processedText = this.preprocessText(text);
            
            const response = await this.client.post('/audio_query', null, {
                params: {
                    text: processedText,
                    speaker: speakerId
                }
            });
            
            const audioQuery = response.data;
            
            // デフォルト値の設定と検証
            const enhancedAudioQuery = {
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
                // オプションパラメータがあれば適用
                ...options
            };
            
            console.log(`オーディオクエリ作成成功: アクセント句数 ${enhancedAudioQuery.accent_phrases.length}`);
            return enhancedAudioQuery;
            
        } catch (error) {
            if (error.response) {
                const status = error.response.status;
                const detail = error.response.data?.detail || error.response.statusText;
                
                if (status === 422) {
                    throw new Error(`テキスト処理エラー: ${detail}`);
                } else if (status === 404) {
                    throw new Error(`スピーカーID ${speakerId} が見つかりません`);
                } else {
                    throw new Error(`VoiceVox API エラー (${status}): ${detail}`);
                }
            } else if (error.code === 'ECONNREFUSED') {
                throw new Error('VoiceVox Engine への接続に失敗しました');
            } else {
                throw new Error(`オーディオクエリ作成失敗: ${error.message}`);
            }
        }
    }

    /**
     * テキストの前処理
     */
    preprocessText(text) {
        if (!text || typeof text !== 'string') {
            throw new Error('有効なテキストが必要です');
        }
        
        // 基本的なテキスト正規化
        let processed = text.trim();
        
        // 連続する空白を単一の空白に変換
        processed = processed.replace(/\s+/g, ' ');
        
        // 制御文字を除去（ただし改行は保持）
        processed = processed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        // 長すぎるテキストは警告
        if (processed.length > 1000) {
            console.warn(`警告: テキストが長すぎます (${processed.length}文字)`);
        }
        
        return processed;
    }

    /**
     * オーディオクエリの速度とピッチを調整
     */
    adjustAudioQuery(audioQuery, speed, pitch) {
        // 速度調整（50-200 → 0.5-2.0）
        audioQuery.speedScale = speed / 100.0;
        
        // ピッチ調整（-50〜50 → pitchScale）
        // VoiceVoxのピッチ調整範囲に合わせて変換
        audioQuery.pitchScale = pitch / 50.0;
        
        return audioQuery;
    }

    /**
     * 音声合成を実行
     */
    async performSynthesis(audioQuery, speakerId) {
        const response = await this.client.post('/synthesis', audioQuery, {
            params: {
                speaker: speakerId
            },
            responseType: 'arraybuffer'
        });
        
        return Buffer.from(response.data);
    }
}