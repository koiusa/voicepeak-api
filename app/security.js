// セキュリティユーティリティ関数
import { spawn } from 'child_process';
import path from 'path';

/**
 * コマンドインジェクション対策
 * 安全な文字列のみを許可し、危険な文字をエスケープ
 */
export class SecurityUtils {
    
    /**
     * ナレーター名の検証とサニタイズ
     * @param {string} narrator - ナレーター名
     * @returns {string} サニタイズされたナレーター名
     * @throws {Error} 不正な文字が含まれる場合
     */
    static validateNarrator(narrator) {
        if (!narrator || typeof narrator !== 'string') {
            throw new Error('ナレーター名が無効です');
        }

        // 許可する文字: 英数字、スペース、ハイフン、アンダースコア、日本語文字
        const allowedPattern = /^[a-zA-Z0-9\s\-_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/;
        
        if (!allowedPattern.test(narrator)) {
            throw new Error('ナレーター名に許可されていない文字が含まれています');
        }

        // 長さ制限
        if (narrator.length > 50) {
            throw new Error('ナレーター名が長すぎます');
        }

        return narrator.trim();
    }

    /**
     * 感情パラメータの検証とサニタイズ
     * @param {string} emotion - 感情パラメータ
     * @returns {string} サニタイズされた感情パラメータ
     */
    static validateEmotion(emotion) {
        if (!emotion || typeof emotion !== 'string') {
            throw new Error('感情パラメータが無効です');
        }

        // 感情パラメータの形式: emotion=value または emotion のみ
        const emotionPattern = /^[a-zA-Z][a-zA-Z0-9_]*(?:=[0-9]+)?$/;
        
        if (!emotionPattern.test(emotion)) {
            throw new Error('感情パラメータの形式が無効です');
        }

        return emotion.trim();
    }

    /**
     * テキストの検証とサニタイズ
     * @param {string} text - 音声合成するテキスト
     * @returns {string} サニタイズされたテキスト
     */
    static validateText(text) {
        if (!text || typeof text !== 'string') {
            throw new Error('テキストが無効です');
        }

        if (text.trim().length === 0) {
            throw new Error('テキストが空です');
        }

        if (text.length > 1000) {
            throw new Error('テキストが長すぎます（最大1000文字）');
        }

        // 危険な文字の検出（除去ではなく、検出したらエラー）
        if (/[`$\\;&|<>]/.test(text)) {
            throw new Error('テキストに不正な文字が含まれています');
        }
        
        if (/[\x00-\x1F]/.test(text)) {
            throw new Error('テキストに制御文字が含まれています');
        }

        // HTMLタグの検出
        if (/<[^>]*>/.test(text)) {
            throw new Error('テキストにHTMLタグが含まれています');
        }

        // JavaScriptの検出
        if (/javascript:/i.test(text)) {
            throw new Error('テキストにJavaScriptが含まれています');
        }

        return text.trim();
    }

    /**
     * 数値パラメータの検証
     * @param {any} value - 検証する値
     * @param {number} min - 最小値
     * @param {number} max - 最大値
     * @param {string} name - パラメータ名
     * @returns {number} 検証済みの数値
     */
    static validateNumericParam(value, min, max, name) {
        // まず型と文字列の検証
        if (value === null || value === undefined) {
            throw new Error(`${name}が指定されていません`);
        }
        
        // 文字列型の場合、SQLインジェクションやコマンドインジェクションをチェック
        if (typeof value === 'string') {
            // SQLインジェクションパターンの検出
            if (/[';"\-\-\/\*\*\/xX]/.test(value) || 
                /\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE|EXEC|EXECUTE)\b/i.test(value)) {
                throw new Error(`${name}にSQLインジェクションの疑いがある文字が含まれています`);
            }
            
            // コマンドインジェクションパターンの検出
            if (/[`$\\;&|<>]/.test(value) || 
                /\$\(.*\)/.test(value) || 
                /`.*`/.test(value)) {
                throw new Error(`${name}にコマンドインジェクションの疑いがある文字が含まれています`);
            }
            
            // 制御文字の検出
            if (/[\x00-\x1F\x7F]/.test(value)) {
                throw new Error(`${name}に制御文字が含まれています`);
            }
        }
        
        const num = Number(value);
        
        if (isNaN(num)) {
            throw new Error(`${name}は数値である必要があります`);
        }
        
        // 無限大や異常値のチェック
        if (!isFinite(num)) {
            throw new Error(`${name}は有限の数値である必要があります`);
        }

        if (num < min || num > max) {
            throw new Error(`${name}は${min}から${max}の間である必要があります`);
        }

        return num;
    }

    /**
     * 安全なコマンド実行（配列形式）
     * @param {string} command - 実行するコマンド
     * @param {string[]} args - コマンド引数の配列
     * @param {object} options - 実行オプション
     * @returns {Promise<string|Buffer>} 実行結果
     */
    static async safeExec(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            // バイナリモードの処理
            let isBinary = options.encoding === 'buffer';
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
                    if (isBinary) {
                        resolve(Buffer.concat(stdout));
                    } else {
                        resolve(stdout.trim());
                    }
                }
            });

            child.on('error', (error) => {
                reject(new Error(`コマンド実行失敗: ${error.message}`));
            });

            // タイムアウト設定
            setTimeout(() => {
                child.kill();
                reject(new Error('コマンド実行がタイムアウトしました'));
            }, 30000); // 30秒タイムアウト
        });
    }

    /**
     * ファイルパスの検証
     * @param {string} filePath - 検証するファイルパス
     * @param {string} allowedDir - 許可されたディレクトリ
     * @returns {string} 正規化されたパス
     */
    static validateFilePath(filePath, allowedDir) {
        const normalizedPath = path.normalize(filePath);
        const normalizedAllowedDir = path.normalize(allowedDir);

        // パストラバーサル攻撃を防ぐ
        if (!normalizedPath.startsWith(normalizedAllowedDir)) {
            throw new Error('不正なファイルパスです');
        }

        // 危険な文字をチェック
        if (/[<>:"|?*]/.test(normalizedPath)) {
            throw new Error('ファイルパスに不正な文字が含まれています');
        }

        return normalizedPath;
    }

    /**
     * レート制限チェック用のシンプルな実装
     */
    static rateLimiter = new Map();

    static checkRateLimit(ip, maxRequests = 10, windowMs = 60000) {
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!this.rateLimiter.has(ip)) {
            this.rateLimiter.set(ip, []);
        }

        const requests = this.rateLimiter.get(ip);
        // 古いリクエストを削除
        const validRequests = requests.filter(time => time > windowStart);
        
        if (validRequests.length >= maxRequests) {
            throw new Error('リクエスト制限に達しました。しばらく待ってから再試行してください。');
        }

        validRequests.push(now);
        this.rateLimiter.set(ip, validRequests);
    }
}