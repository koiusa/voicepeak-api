/**
 * Application configuration constants
 * Centralizes all configuration values for better maintainability
 */

/**
 * Default configuration values
 */
export const CONFIG = {
    // Server configuration
    DEFAULT_PORT: 3000,
    DEFAULT_ENGINE: 'voicepeak',
    
    // Rate limiting defaults
    RATE_LIMIT: {
        WINDOW_MS: 60000,
        GET_REQUESTS: 50,
        POST_REQUESTS: 20
    },
    
    // Text processing limits
    TEXT_LIMITS: {
        MAX_LENGTH: 1000,
        MAX_NARRATOR_LENGTH: 50
    },
    
    // Audio synthesis parameters
    AUDIO_PARAMS: {
        SPEED: {
            MIN: 50,
            MAX: 200,
            DEFAULT: 100
        },
        PITCH: {
            MIN: -50,
            MAX: 50,
            DEFAULT: 0
        },
        EMOTION_DEFAULT_VALUE: 50
    },
    
    // VoiceVox compatibility
    VOICEVOX: {
        BASE_SPEAKER_ID: 2041348160,
        DEFAULT_SPEAKER_UUID: 1,
        OUTPUT_SAMPLING_RATE: 24000,
        OUTPUT_STEREO: false
    },
    
    // File handling
    FILES: {
        TEMP_DIR: 'temp',
        LOG_FILE: '../app.log'
    },
    
    // Default narrator and emotion
    DEFAULTS: {
        NARRATOR: 'Miyamai Moca',
        EMOTION: 'honwaka'
    },
    
    // Timeouts and limits
    TIMEOUTS: {
        COMMAND_EXECUTION: 30000,
        API_REQUEST: 30000
    }
};

/**
 * API endpoint paths
 */
export const ENDPOINTS = {
    NARRATORS: '/api/narrators',
    EMOTIONS: '/api/emotions',
    EMOTIONS_BY_NARRATOR: '/api/emotions/:narrator',
    SYNTHESIZE: '/api/synthesize',
    VOICEVOX_SPEAKERS: '/speakers',
    VOICEVOX_AUDIO_QUERY: '/audio_query',
    VOICEVOX_SYNTHESIS: '/synthesis',
    DOCS: '/docs'
};

/**
 * Error messages for consistency
 */
export const ERROR_MESSAGES = {
    RATE_LIMIT: 'リクエスト制限に達しました',
    INVALID_TEXT: '無効なテキストです',
    INVALID_NARRATOR: '無効なナレーター名です',
    INVALID_EMOTION: '無効な感情パラメータです',
    INVALID_NUMERIC: '無効な数値パラメータです',
    FORBIDDEN_CHARS: '許可されていない文字が含まれています',
    FILE_PATH_ERROR: 'ファイルパスエラーが発生しました',
    SYNTHESIS_FAILED: '音声ファイルの生成に失敗しました',
    INTERNAL_ERROR: '内部サーバーエラーが発生しました',
    MISSING_PARAMETER: 'パラメータが必要です',
    SPEAKER_NOT_FOUND: '指定されたスピーカーIDが見つかりません',
    TEXT_NOT_FOUND: 'テキストが見つかりません',
    VOICEVOX_CONNECTION_FAILED: 'VoiceVox Engine への接続に失敗しました'
};

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500
};

/**
 * Environment variable names
 */
export const ENV_VARS = {
    NODE_ENV: 'NODE_ENV',
    PORT: 'PORT',
    VOICEPEAK_HOST_PATH: 'VOICEPEAK_HOST_PATH',
    VOICEVOX_ENGINE_URL: 'VOICEVOX_ENGINE_URL',
    VOICEVOX_ENGINE_ENABLED: 'VOICEVOX_ENGINE_ENABLED',
    DEFAULT_ENGINE: 'DEFAULT_ENGINE',
    RATE_LIMIT_WINDOW_MS: 'RATE_LIMIT_WINDOW_MS',
    RATE_LIMIT_GET_REQUESTS: 'RATE_LIMIT_GET_REQUESTS',
    RATE_LIMIT_POST_REQUESTS: 'RATE_LIMIT_POST_REQUESTS'
};