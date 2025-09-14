/**
 * Voicepeak API Server
 * A REST API service for text-to-speech conversion using Voicepeak
 * Includes VoiceVox compatibility layer
 */
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';
import expand from 'dotenv-expand';
import swaggerUi from 'swagger-ui-express';

// Import modular components
import { Logger } from './utils/logger.js';
import { requestLoggingMiddleware } from './middleware/request-logging.js';
import { createVoicepeakRoutes } from './routes/voicepeak-api.js';
import { createVoiceVoxRoutes } from './routes/voicevox-compat.js';
import { specs } from './swagger.js';
import { VoiceVoxAdapter } from './voicevox-adapter.js';
import { CONFIG, ENV_VARS } from './config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment configuration
expand.expand(config());

// Initialize Express app
const app = express();
const PORT = process.env[ENV_VARS.PORT] || CONFIG.DEFAULT_PORT;

// Configuration from environment variables with fallbacks
const RATE_LIMIT_WINDOW_MS = parseInt(process.env[ENV_VARS.RATE_LIMIT_WINDOW_MS]) || CONFIG.RATE_LIMIT.WINDOW_MS;
const RATE_LIMIT_GET_REQUESTS = parseInt(process.env[ENV_VARS.RATE_LIMIT_GET_REQUESTS]) || CONFIG.RATE_LIMIT.GET_REQUESTS;
const RATE_LIMIT_POST_REQUESTS = parseInt(process.env[ENV_VARS.RATE_LIMIT_POST_REQUESTS]) || CONFIG.RATE_LIMIT.POST_REQUESTS;
const voiceVoxEnabled = process.env[ENV_VARS.VOICEVOX_ENGINE_ENABLED] === 'true';
const defaultEngine = process.env[ENV_VARS.DEFAULT_ENGINE] || CONFIG.DEFAULT_ENGINE;

// Setup centralized logging
Logger.setupConsoleOverride();

// Initialize VoiceVox adapter if enabled
let voiceVoxAdapter = null;
if (voiceVoxEnabled) {
    try {
        voiceVoxAdapter = new VoiceVoxAdapter();
    } catch (error) {
        Logger.warn('VoiceVox adapter initialization failed:', error.message);
    }
}

// Validate Voicepeak installation
const voicepeakPath = `${process.env[ENV_VARS.VOICEPEAK_HOST_PATH]}/voicepeak`;
const voicepeakDir = process.env[ENV_VARS.VOICEPEAK_HOST_PATH];
if (!fs.existsSync(voicepeakPath)) {
    Logger.error('Error: Voicepeak not found at:', voicepeakPath);
    Logger.error('Please ensure VOICEPEAK_HOST_PATH is set correctly in .env file');
    process.exit(1);
}

// Setup temporary directory for audio files
const TEMP_DIR = path.join(__dirname, CONFIG.FILES.TEMP_DIR);
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Configure Express middleware
app.use(cors());
app.use(requestLoggingMiddleware());

// JSON body parsers with size limits
app.use('/api', express.json({ limit: '1mb' }));
app.use('/speakers', express.json({ limit: '1mb' }));
app.use('/synthesis', express.json({ limit: '1mb' }));
app.use('/audio_query', express.json({ limit: '1mb' }));

// Setup Swagger documentation
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

// Setup API routes
const voicepeakRoutes = createVoicepeakRoutes(
    voicepeakPath, 
    voicepeakDir, 
    TEMP_DIR, 
    RATE_LIMIT_GET_REQUESTS, 
    RATE_LIMIT_POST_REQUESTS, 
    RATE_LIMIT_WINDOW_MS
);

const voiceVoxRoutes = createVoiceVoxRoutes(
    voicepeakPath, 
    voicepeakDir, 
    TEMP_DIR, 
    RATE_LIMIT_GET_REQUESTS, 
    RATE_LIMIT_POST_REQUESTS, 
    RATE_LIMIT_WINDOW_MS
);

// Mount routes
app.use('/api', voicepeakRoutes);
app.use('/', voiceVoxRoutes);

// Start server
app.listen(PORT, () => {
    Logger.info(`=== Voicepeak API Server ===`);
    Logger.info(`サーバー起動: ポート ${PORT}`);
    Logger.info(`デフォルトエンジン: ${defaultEngine}`);
    Logger.info(`VoiceVox Engine: ${voiceVoxEnabled ? '有効' : '無効'}`);
    Logger.info(`レート制限: GET ${RATE_LIMIT_GET_REQUESTS}req/${RATE_LIMIT_WINDOW_MS}ms, POST ${RATE_LIMIT_POST_REQUESTS}req/${RATE_LIMIT_WINDOW_MS}ms`);
    Logger.info(`利用可能なエンドポイント:`);
    Logger.info(`  GET  /api/narrators           - ナレーター一覧`);
    Logger.info(`  GET  /api/emotions            - デフォルト感情一覧`);
    Logger.info(`  GET  /api/emotions/:narrator  - 感情パラメータ一覧`);
    Logger.info(`  POST /api/synthesize          - テキスト音声変換`);
    Logger.info(`  GET  /speakers                - VoiceVox互換: スピーカー一覧`);
    Logger.info(`  POST /audio_query             - VoiceVox互換: オーディオクエリ作成`);
    Logger.info(`  POST /synthesis               - VoiceVox互換: 音声合成`);
    Logger.info(`  GET  /docs                    - API仕様書（Swagger UI）`);
    Logger.info(`=============================`);
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
    Logger.info('SIGTERM受信: サーバーを終了中...');
    process.exit(0);
});

process.on('SIGINT', () => {
    Logger.info('SIGINT受信: サーバーを終了中...');
    process.exit(0);
});

// Error handlers
process.on('uncaughtException', (error) => {
    Logger.error('未処理の例外:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    Logger.error('未処理のPromise拒否:', reason);
    process.exit(1);
});
