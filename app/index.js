import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';
import expand from 'dotenv-expand';
import { SecurityUtils } from './security.js';
import swaggerUi from 'swagger-ui-express';
import { specs } from './swagger.js';
import { VoiceVoxAdapter } from './voicevox-adapter.js';

// .envファイルを読み込み（appディレクトリから）
expand.expand(config());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// レート制限設定
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
const RATE_LIMIT_GET_REQUESTS = parseInt(process.env.RATE_LIMIT_GET_REQUESTS) || 50;
const RATE_LIMIT_POST_REQUESTS = parseInt(process.env.RATE_LIMIT_POST_REQUESTS) || 20;

// VoiceVox Engine アダプターの初期化
const voiceVoxEnabled = process.env.VOICEVOX_ENGINE_ENABLED === 'true';
const defaultEngine = process.env.DEFAULT_ENGINE || 'voicepeak';
let voiceVoxAdapter = null;

if (voiceVoxEnabled) {
    voiceVoxAdapter = new VoiceVoxAdapter();
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Swagger UI ドキュメント
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Voicepeak API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true
    }
}));

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ホストのVoicepeakバイナリを直接指定
const voicepeakPath = `${process.env.VOICEPEAK_HOST_PATH}/voicepeak`;
const voicepeakDir = process.env.VOICEPEAK_HOST_PATH;
if (!fs.existsSync(voicepeakPath)) {
    console.error('Error: Voicepeak not found at:', voicepeakPath);
    console.error('Please ensure VOICEPEAK_HOST_PATH is set correctly in .env file');
    process.exit(1);
}

// スピーカーIDからナレーターと感情を逆引きする関数
async function findNarratorByStyleId(styleId) {
    try {
        // ナレーター一覧を取得
        const result = await SecurityUtils.safeExec(voicepeakPath, [
            '--list-narrator'
        ], { cwd: voicepeakDir });
        
        const narrators = result.split('\n').filter(line => line.trim() && !line.includes('UserApplication'));
        let currentId = 2041348160;
        
        for (const narrator of narrators) {
            try {
                // 各ナレーターの感情一覧を取得
                const emotionResult = await SecurityUtils.safeExec(voicepeakPath, [
                    '--list-emotion',
                    narrator
                ], { cwd: voicepeakDir });
                
                const emotions = emotionResult.split('\n').filter(line => line.trim() && !line.includes('UserApplication'));
                
                for (const emotion of emotions) {
                    if (currentId === styleId) {
                        return {
                            narrator: narrator,
                            emotion: emotion
                        };
                    }
                    currentId++;
                }
            } catch (emotionError) {
                console.error(`感情取得エラー (${narrator}):`, emotionError);
                // エラー時はデフォルトスタイルをチェック
                if (currentId === styleId) {
                    return {
                        narrator: narrator,
                        emotion: 'honwaka'
                    };
                }
                currentId++;
            }
        }
        
        return null; // 見つからない場合
    } catch (error) {
        console.error('ナレーター逆引きエラー:', error);
        return null;
    }
}

app.get('/api/narrators', async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
        SecurityUtils.checkRateLimit(clientIp, RATE_LIMIT_GET_REQUESTS, RATE_LIMIT_WINDOW_MS);
        
        console.log('ナレーター一覧要求');      
            
        // 従来のVoicepeak処理
        const result = await SecurityUtils.safeExec(voicepeakPath, [
            '--list-narrator'
        ], { cwd: voicepeakDir });
        
        const narrators = result.split('\n').filter(line => line.trim() && !line.includes('UserApplication'));
        console.log(`取得したナレーター: ${narrators.join(', ')}`);
        res.json({ narrators });
        
    } catch (error) {
        console.error('ナレーター一覧取得エラー:', error);
        let statusCode = 422;
        let errorDetail = [];
        
        if (error.message.includes('リクエスト制限')) {
            statusCode = 429;
            errorDetail = [
                {
                    loc: ["request"],
                    msg: "リクエスト制限に達しました",
                    type: "rate_limit"
                }
            ];
        } else {
            statusCode = 500;
            errorDetail = [
                {
                    loc: ["narrators"],
                    msg: "ナレーター一覧の取得に失敗しました",
                    type: "internal_error"
                }
            ];
        }
        
        res.status(statusCode).json({
            detail: errorDetail
        });
    }
});

app.get('/api/emotions', async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
        SecurityUtils.checkRateLimit(clientIp, RATE_LIMIT_GET_REQUESTS, RATE_LIMIT_WINDOW_MS);
        
        console.log('デフォルト感情一覧要求');
        
        // 従来のVoicepeak処理
        const defaultNarrator = 'Miyamai Moca';
        console.log(`感情一覧要求 - デフォルトナレーター: ${defaultNarrator}`);
        
        const result = await SecurityUtils.safeExec(voicepeakPath, [
            '--list-emotion',
            defaultNarrator
        ], { cwd: voicepeakDir });
        
        const emotions = result.split('\n').filter(line => line.trim() && !line.includes('UserApplication'));
        console.log(`取得した感情 (${defaultNarrator}): ${emotions.join(', ')}`);
        res.json({ emotions, narrator: defaultNarrator });
        
    } catch (error) {
        console.error('感情一覧取得エラー:', error);
        let statusCode = 422;
        let errorDetail = [];
        
        if (error.message.includes('リクエスト制限')) {
            statusCode = 429;
            errorDetail = [
                {
                    loc: ["request"],
                    msg: "リクエスト制限に達しました",
                    type: "rate_limit"
                }
            ];
        } else {
            statusCode = 500;
            errorDetail = [
                {
                    loc: ["emotions"],
                    msg: "感情一覧の取得に失敗しました",
                    type: "internal_error"
                }
            ];
        }
        
        res.status(statusCode).json({
            detail: errorDetail
        });
    }
});

app.get('/api/emotions/:narrator', async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
        SecurityUtils.checkRateLimit(clientIp, RATE_LIMIT_GET_REQUESTS, RATE_LIMIT_WINDOW_MS);
        
        const narrator = SecurityUtils.validateNarrator(req.params.narrator);
        
        console.log(`感情一覧要求 - ${narrator}`);
    
        // 従来のVoicepeak処理
        const result = await SecurityUtils.safeExec(voicepeakPath, [
            '--list-emotion',
            narrator
        ], { cwd: voicepeakDir });
        
        const emotions = result.split('\n').filter(line => line.trim() && !line.includes('UserApplication'));
        console.log(`取得した感情 (${narrator}): ${emotions.join(', ')}`);
        res.json({ emotions });
        
    } catch (error) {
        console.error('感情一覧取得エラー:', error);
        let statusCode = 422;
        let errorDetail = [];
        
        if (error.message.includes('リクエスト制限')) {
            statusCode = 429;
            errorDetail = [
                {
                    loc: ["request"],
                    msg: "リクエスト制限に達しました",
                    type: "rate_limit"
                }
            ];
        } else if (error.message.includes('ナレーター名')) {
            errorDetail = [
                {
                    loc: ["path", "narrator"],
                    msg: "無効なナレーター名です",
                    type: "value_error"
                }
            ];
        } else if (error.message.includes('許可されていない文字')) {
            errorDetail = [
                {
                    loc: ["path", "narrator"],
                    msg: "許可されていない文字が含まれています",
                    type: "value_error"
                }
            ];
        } else {
            statusCode = 500;
            errorDetail = [
                {
                    loc: ["emotions"],
                    msg: "感情一覧の取得に失敗しました",
                    type: "internal_error"
                }
            ];
        }
        
        res.status(statusCode).json({
            detail: errorDetail
        });
    }
});

app.post('/api/synthesize', async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
        SecurityUtils.checkRateLimit(clientIp, RATE_LIMIT_POST_REQUESTS, RATE_LIMIT_WINDOW_MS);
        
        const { text, narrator = 'Miyamai Moca', emotion = 'honwaka', speed = 100, pitch = 0 } = req.body;
        
        // SecurityUtilsを使用した厳密なバリデーション
        const validatedText = SecurityUtils.validateText(text);
        const validatedNarrator = SecurityUtils.validateNarrator(narrator);
        const validatedEmotion = SecurityUtils.validateEmotion(emotion);
        const validatedSpeed = SecurityUtils.validateNumericParam(speed, 50, 200, 'スピード');
        const validatedPitch = SecurityUtils.validateNumericParam(pitch, -50, 50, 'ピッチ');
        
        console.log(`音声合成リクエスト: "${validatedText}" (${validatedNarrator}, ${validatedEmotion})`);
        

        // 従来のVoicepeak処理
        console.log('Voicepeak を使用して音声合成実行');
        const outputId = uuidv4();
        const outputPath = SecurityUtils.validateFilePath(
            path.join(TEMP_DIR, `${outputId}.wav`), 
            TEMP_DIR
        );
        
        const emotionParam = validatedEmotion.includes('=') ? validatedEmotion : `${validatedEmotion}=50`;
        const args = [
            '--say', validatedText,
            '--out', outputPath,
            '--narrator', validatedNarrator,
            '--emotion', emotionParam
        ];
        if (validatedSpeed !== 100) {
            args.push('--speed', validatedSpeed.toString());
        }
        if (validatedPitch !== 0) {
            args.push('--pitch', validatedPitch.toString());
        }
        
        console.log(`Voicepeakコマンド実行: ${voicepeakPath} ${args.join(' ')}`);
        await SecurityUtils.safeExec(voicepeakPath, args, { cwd: voicepeakDir });
        
        if (!fs.existsSync(outputPath)) {
            throw new Error('音声ファイルが生成されませんでした');
        }
        
        // WAVバイナリを直接返却
        const wavBuffer = fs.readFileSync(outputPath);
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Disposition', `attachment; filename="voice_${outputId}.wav"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(wavBuffer);
        
        fs.unlink(outputPath, (err) => {
            if (err) console.error('一時ファイル削除エラー:', err);
            else console.log(`一時ファイル削除: ${outputPath}`);
        });
        
    } catch (error) {
        console.error('音声合成エラー:', error);
        let statusCode = 422;
        let errorDetail = [];
        
        if (error.message.includes('リクエスト制限')) {
            statusCode = 429;
            errorDetail = [
                {
                    loc: ["request"],
                    msg: "リクエスト制限に達しました",
                    type: "rate_limit"
                }
            ];
        } else if (error.message.includes('テキスト')) {
            errorDetail = [
                {
                    loc: ["body", "text"],
                    msg: "無効なテキストです",
                    type: "value_error"
                }
            ];
        } else if (error.message.includes('ナレーター名')) {
            errorDetail = [
                {
                    loc: ["body", "narrator"],
                    msg: "無効なナレーター名です",
                    type: "value_error"
                }
            ];
        } else if (error.message.includes('感情')) {
            errorDetail = [
                {
                    loc: ["body", "emotion"],
                    msg: "無効な感情パラメータです",
                    type: "value_error"
                }
            ];
        } else if (error.message.includes('数値') || error.message.includes('スピード') || error.message.includes('ピッチ')) {
            errorDetail = [
                {
                    loc: ["body", "speed"],
                    msg: "無効な数値パラメータです",
                    type: "value_error"
                }
            ];
        } else if (error.message.includes('許可されていない文字') || error.message.includes('不正な文字')) {
            errorDetail = [
                {
                    loc: ["body", "text"],
                    msg: "許可されていない文字が含まれています",
                    type: "value_error"
                }
            ];
        } else if (error.message.includes('ファイルパス')) {
            errorDetail = [
                {
                    loc: ["internal"],
                    msg: "ファイルパスエラーが発生しました",
                    type: "internal_error"
                }
            ];
        } else if (error.message.includes('音声ファイルが生成されませんでした')) {
            errorDetail = [
                {
                    loc: ["synthesis"],
                    msg: "Voicepeakが音声ファイルを生成できませんでした。パラメータを確認してください。",
                    type: "synthesis_error"
                }
            ];
        } else {
            statusCode = 500;
            errorDetail = [
                {
                    loc: ["internal"],
                    msg: "内部サーバーエラーが発生しました",
                    type: "internal_error"
                }
            ];
        }
        
        res.status(statusCode).json({
            detail: errorDetail
        });
    }
});

// ==========================================================================
// VoiceVox 互換エンドポイント
// ==========================================================================

app.get('/speakers', async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
        SecurityUtils.checkRateLimit(clientIp, RATE_LIMIT_GET_REQUESTS, RATE_LIMIT_WINDOW_MS);
        
        console.log('VoiceVox互換: スピーカー一覧要求');
        
        // Voicepeakのナレーター一覧を取得
        const result = await SecurityUtils.safeExec(voicepeakPath, [
            '--list-narrator'
        ], { cwd: voicepeakDir });
        
        const narrators = result.split('\n').filter(line => line.trim() && !line.includes('UserApplication'));
        console.log(`取得したナレーター: ${narrators.join(', ')}`);
        
        // VoiceVox互換形式に変換
        const speakers = [];
        let baseId = 2041348160;
        
        for (const narrator of narrators) {
            try {
                // 各ナレーターの感情一覧を取得
                const emotionResult = await SecurityUtils.safeExec(voicepeakPath, [
                    '--list-emotion',
                    narrator
                ], { cwd: voicepeakDir });
                
                const emotions = emotionResult.split('\n').filter(line => line.trim() && !line.includes('UserApplication'));
                console.log(`取得した感情 (${narrator}): ${emotions.join(', ')}`);
                
                // 感情をstylesに変換
                const styles = emotions.map((emotion, index) => ({
                    name: emotion,
                    id: baseId + index,
                    type: "talk"
                }));
                
                // ナレーター名からUUIDを生成
                const speakerUuid = `voicepeak-${narrator.replace(/\s+/g, '-').toLowerCase()}`;
                
                speakers.push({
                    name: narrator,
                    speaker_uuid: speakerUuid,
                    styles: styles,
                    version: "1.0.0",
                    supported_features: {
                        permitted_synthesis_morphing: "ALL"
                    }
                });
                
                // 次のナレーター用にIDを調整（感情数分進める）
                baseId += emotions.length;
                
            } catch (emotionError) {
                console.error(`感情取得エラー (${narrator}):`, emotionError);
                // 感情取得に失敗した場合はデフォルトスタイルを使用
                const speakerUuid = `voicepeak-${narrator.replace(/\s+/g, '-').toLowerCase()}`;
                speakers.push({
                    name: narrator,
                    speaker_uuid: speakerUuid,
                    styles: [{
                        name: "通常",
                        id: baseId,
                        type: "talk"
                    }],
                    version: "1.0.0",
                    supported_features: {
                        permitted_synthesis_morphing: "ALL"
                    }
                });
                baseId += 1;
            }
        }
        
        console.log(`VoiceVox互換スピーカー形式に変換完了: ${speakers.length}件`);
        res.json(speakers);
        
    } catch (error) {
        console.error('VoiceVox互換: スピーカー一覧取得エラー:', error);
        let statusCode = 422;
        let errorDetail = [];
        
        if (error.message.includes('リクエスト制限')) {
            statusCode = 429;
            errorDetail = [
                {
                    loc: ["request"],
                    msg: "リクエスト制限に達しました",
                    type: "rate_limit"
                }
            ];
        } else {
            statusCode = 500;
            errorDetail = [
                {
                    loc: ["speakers"],
                    msg: "スピーカー一覧の取得に失敗しました",
                    type: "internal_error"
                }
            ];
        }
        
        res.status(statusCode).json({
            detail: errorDetail
        });
    }
});

app.post('/audio_query', async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
        SecurityUtils.checkRateLimit(clientIp, RATE_LIMIT_POST_REQUESTS, RATE_LIMIT_WINDOW_MS);
        
        // クエリパラメータとボディの両方をサポート
        const text = req.query?.text || req.body?.text;
        const speaker = req.query?.speaker || req.body?.speaker;
        
        // テキストバリデーション
        if (!text) {
            return res.status(422).json({
                detail: [
                    {
                        loc: ["body", "text"],
                        msg: "textパラメータが必要です",
                        type: "missing"
                    }
                ]
            });
        }
        
        // 安全なテキストバリデーション
        const validatedText = SecurityUtils.validateText(text);
        
        // スピーカーIDバリデーション
        if (!speaker) {
            return res.status(422).json({
                detail: [
                    {
                        loc: ["body", "speaker"],
                        msg: "speakerパラメータが必要です",
                        type: "missing"
                    }
                ]
            });
        }
        
        // スピーカーIDを数値として検証
        const speakerId = parseInt(speaker);
        if (isNaN(speakerId) || speakerId < 0) {
            return res.status(422).json({
                detail: [
                    {
                        loc: ["body", "speaker"],
                        msg: "有効なスピーカーIDを指定してください",
                        type: "value_error"
                    }
                ]
            });
        }
        
        console.log(`VoiceVox互換: オーディオクエリ作成 - "${validatedText}" (speaker: ${speakerId})`);
        
        // スピーカーIDからナレーターと感情を逆引き
        const narratorInfo = await findNarratorByStyleId(speakerId);
        if (!narratorInfo) {
            return res.status(422).json({
                detail: [
                    {
                        loc: ["body", "speaker"],
                        msg: "指定されたスピーカーIDが見つかりません",
                        type: "value_error"
                    }
                ]
            });
        }
        
        console.log(`ナレーター情報: ${narratorInfo.narrator} - ${narratorInfo.emotion}`);
        
        // VoiceVox互換のオーディオクエリ形式を生成
        // 実際の音声解析は行わず、標準的な構造を返す
        const audioQuery = {
            accent_phrases: [
                {
                    moras: validatedText.split('').map((char, index) => ({
                        text: char,
                        consonant: null,
                        consonant_length: 0,
                        vowel: char,
                        vowel_length: 0.1,
                        pitch: 5.0
                    })),
                    accent: 1,
                    pause_mora: null,
                    is_interrogative: validatedText.includes('？') || validatedText.includes('?')
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
            kana: validatedText
        };
        
        console.log(`オーディオクエリ作成成功: サンプリング周波数 ${audioQuery.outputSamplingRate}Hz`);
        res.json(audioQuery);
        
    } catch (error) {
        console.error('VoiceVox互換: オーディオクエリ作成エラー:', error);
        let statusCode = 422;
        let errorDetail = [];
        
        if (error.message.includes('リクエスト制限')) {
            statusCode = 429;
            errorDetail = [
                {
                    loc: ["request"],
                    msg: "リクエスト制限に達しました",
                    type: "rate_limit"
                }
            ];
        } else if (error.message.includes('テキスト')) {
            errorDetail = [
                {
                    loc: ["body", "text"],
                    msg: "無効なテキストです",
                    type: "value_error"
                }
            ];
        } else if (error.message.includes('許可されていない文字')) {
            errorDetail = [
                {
                    loc: ["body", "text"],
                    msg: "許可されていない文字が含まれています",
                    type: "value_error"
                }
            ];
        } else if (error.message.includes('スピーカー')) {
            errorDetail = [
                {
                    loc: ["body", "speaker"],
                    msg: "無効なスピーカーIDです",
                    type: "value_error"
                }
            ];
        } else {
            errorDetail = [
                {
                    loc: ["internal"],
                    msg: "内部サーバーエラーが発生しました",
                    type: "internal_error"
                }
            ];
        }
        
        res.status(statusCode).json({
            detail: errorDetail
        });
    }
});

app.post('/synthesis', async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
        SecurityUtils.checkRateLimit(clientIp, RATE_LIMIT_POST_REQUESTS, RATE_LIMIT_WINDOW_MS);
        
        const audioQuery = req.body;
        const { speaker } = req.query;
        
        if (!audioQuery) {
            return res.status(422).json({
                detail: [
                    {
                        loc: ["body"],
                        msg: "オーディオクエリが必要です",
                        type: "missing"
                    }
                ]
            });
        }
        
        if (!speaker) {
            return res.status(422).json({
                detail: [
                    {
                        loc: ["query", "speaker"],
                        msg: "speakerパラメータが必要です",
                        type: "missing"
                    }
                ]
            });
        }
        
        // スピーカーIDを数値として検証
        const speakerId = parseInt(speaker);
        if (isNaN(speakerId) || speakerId < 0) {
            return res.status(422).json({
                detail: [
                    {
                        loc: ["query", "speaker"],
                        msg: "有効なスピーカーIDを指定してください",
                        type: "value_error"
                    }
                ]
            });
        }
        
        console.log(`VoiceVox互換: 音声合成実行 (speaker: ${speaker})`);
        
        // スピーカーIDからナレーターと感情を逆引き
        const narratorInfo = await findNarratorByStyleId(speakerId);
        if (!narratorInfo) {
            return res.status(422).json({
                detail: [
                    {
                        loc: ["query", "speaker"],
                        msg: "指定されたスピーカーIDが見つかりません",
                        type: "value_error"
                    }
                ]
            });
        }
        
        // オーディオクエリからテキストを抽出、またはシンプルリクエストのtextフィールドを使用
        let text = '';
        let speed = 100;
        let pitch = 0;
        
        // シンプルリクエスト形式をチェック（textフィールドがある場合）
        if (audioQuery.text) {
            text = audioQuery.text;
            speed = audioQuery.speed || 100;
            pitch = audioQuery.pitch || 0;
            
            // パラメータ範囲バリデーション
            if (speed < 50 || speed > 200) {
                return res.status(422).json({
                    detail: [
                        {
                            loc: ["body", "speed"],
                            msg: "スピードは50から200の間である必要があります",
                            type: "value_error"
                        }
                    ]
                });
            }
            
            if (pitch < -50 || pitch > 50) {
                return res.status(422).json({
                    detail: [
                        {
                            loc: ["body", "pitch"],
                            msg: "ピッチは-50から50の間である必要があります",
                            type: "value_error"
                        }
                    ]
                });
            }
        } else {
            // 標準のオーディオクエリ形式
            text = audioQuery.kana || '';
            if (!text && audioQuery.accent_phrases && audioQuery.accent_phrases.length > 0) {
                // accent_phrasesからテキストを再構築
                text = audioQuery.accent_phrases
                    .map(phrase => phrase.moras.map(mora => mora.text).join(''))
                    .join('');
            }
            
            // オーディオクエリのパラメータをVoicepeakパラメータに変換
            speed = Math.round((audioQuery.speedScale || 1.0) * 100);
            pitch = Math.round((audioQuery.pitchScale || 0.0) * 50);
        }
        
        if (!text) {
            return res.status(422).json({
                detail: [
                    {
                        loc: ["body", "kana"],
                        msg: "テキストが見つかりません",
                        type: "value_error"
                    }
                ]
            });
        }
        
        // テキストバリデーション
        const validatedText = SecurityUtils.validateText(text);
        
        // Voicepeakで音声合成を実行
        console.log(`Voicepeak音声合成: "${validatedText}" (${narratorInfo.narrator}, ${narratorInfo.emotion})`);
        
        const outputId = uuidv4();
        const outputPath = SecurityUtils.validateFilePath(
            path.join(TEMP_DIR, `${outputId}.wav`), 
            TEMP_DIR
        );
        
        const emotionParam = narratorInfo.emotion.includes('=') ? narratorInfo.emotion : `${narratorInfo.emotion}=50`;
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
        
        console.log(`Voicepeakコマンド実行: ${voicepeakPath} ${args.join(' ')}`);
        await SecurityUtils.safeExec(voicepeakPath, args, { cwd: voicepeakDir });
        
        if (!fs.existsSync(outputPath)) {
            throw new Error('音声ファイルが生成されませんでした');
        }
        
        // WAVバイナリを直接返却
        const wavBuffer = fs.readFileSync(outputPath);
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Disposition', `attachment; filename="voice_${outputId}.wav"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(wavBuffer);
        
        fs.unlink(outputPath, (err) => {
            if (err) console.error('一時ファイル削除エラー:', err);
            else console.log(`一時ファイル削除: ${outputPath}`);
        });
        
    } catch (error) {
        console.error('VoiceVox互換: 音声合成エラー:', error);
        let statusCode = 422;
        let errorDetail = [];
        
        if (error.message.includes('リクエスト制限')) {
            statusCode = 429;
            errorDetail = [
                {
                    loc: ["request"],
                    msg: "リクエスト制限に達しました",
                    type: "rate_limit"
                }
            ];
        } else if (error.message.includes('テキスト')) {
            errorDetail = [
                {
                    loc: ["body", "kana"],
                    msg: "無効なテキストです",
                    type: "value_error"
                }
            ];
        } else if (error.message.includes('ナレーター名')) {
            errorDetail = [
                {
                    loc: ["body", "narrator"],
                    msg: "無効なナレーター名です",
                    type: "value_error"
                }
            ];
        } else if (error.message.includes('感情')) {
            errorDetail = [
                {
                    loc: ["body", "emotion"],
                    msg: "無効な感情パラメータです",
                    type: "value_error"
                }
            ];
        } else if (error.message.includes('音声ファイルが生成されませんでした')) {
            errorDetail = [
                {
                    loc: ["synthesis"],
                    msg: "音声ファイルの生成に失敗しました",
                    type: "synthesis_error"
                }
            ];
        } else {
            errorDetail = [
                {
                    loc: ["internal"],
                    msg: "内部サーバーエラーが発生しました",
                    type: "internal_error"
                }
            ];
        }
        
        res.status(statusCode).json({
            detail: errorDetail
        });
    }
});

app.listen(PORT, () => {
    console.log(`=== Voicepeak API Server ===`);
    console.log(`サーバー起動: ポート ${PORT}`);
    console.log(`デフォルトエンジン: ${defaultEngine}`);
    console.log(`VoiceVox Engine: ${voiceVoxEnabled ? '有効' : '無効'}`);
    console.log(`レート制限: GET ${RATE_LIMIT_GET_REQUESTS}req/${RATE_LIMIT_WINDOW_MS}ms, POST ${RATE_LIMIT_POST_REQUESTS}req/${RATE_LIMIT_WINDOW_MS}ms`);
    console.log(`利用可能なエンドポイント:`);
    console.log(`  GET  /api/narrators           - ナレーター一覧`);
    console.log(`  GET  /api/emotions            - デフォルト感情一覧`);
    console.log(`  GET  /api/emotions/:narrator  - 感情パラメータ一覧`);
    console.log(`  POST /api/synthesize          - テキスト音声変換`);
    console.log(`  GET  /speakers                - VoiceVox互換: スピーカー一覧`);
    console.log(`  POST /audio_query             - VoiceVox互換: オーディオクエリ作成`);
    console.log(`  POST /synthesis               - VoiceVox互換: 音声合成`);
    console.log(`  GET  /docs                    - API仕様書（Swagger UI）`);
    console.log(`=============================`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM受信: サーバーを終了中...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT受信: サーバーを終了中...');
    process.exit(0);
});
