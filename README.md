# Voicepeak API

テキストを音声に変換するWebAPIサービス。ホスト環境でVoicepeakを利用し、RESTfulなAPIで音声合成を提供します。

## 主な機能
- **Voicepeak API**: テキスト→音声変換（WAV形式）
- **VoiceVox互換API**: VoiceVoxエンジンとの互換性（Voicepeakベース実装）
- **systemdサービス管理**: サービスとして登録・管理
- **ハイブリッドエンジン**: VoiceVoxエンジンとVoicepeakの併用対応
- 複数ナレーター・感情表現対応
- オプション（速度・ピッチ）指定
- エラー時はJSONで詳細返却

## セットアップ

### 必要環境
- Node.js 22+（推奨）
- Voicepeak（ホストにインストール済み）
- VoiceVoxエンジン（オプション、互換性使用時）
- Python 3.8+（テスト用）

### 1. リポジトリ取得
```bash
git clone <repository-url>
cd voicepeek-api
```

### 2. 環境変数設定
```bash
cp app/.env.example app/.env
# .envでVOICEPEAK_HOST_PATHを設定
```

### 3. 依存関係インストール
```bash
cd app
npm install
```

### 4. サーバー起動方法

#### A. systemdサービス（推奨）
```bash
# サービス登録
sudo ./service-manager.sh install

# サービス開始
sudo ./service-manager.sh start

# サービス状態確認
./service-manager.sh status

# サービス停止
sudo ./service-manager.sh stop

# サービス解除
sudo ./service-manager.sh uninstall
```

#### B. 手動起動
```bash
# フォアグラウンド実行
VOICEPEAK_HOST_PATH="/path/to/voicepeak" node index.js

# バックグラウンド実行
nohup VOICEPEAK_HOST_PATH="/path/to/voicepeak" node index.js > /tmp/voicepeak-api.log 2>&1 &
```

#### C. 管理スクリプト使用
```bash
# 起動
./voicepeak-api.sh start

# 停止
./voicepeak-api.sh stop

# 再起動
./voicepeak-api.sh restart

# 状態確認
./voicepeak-api.sh status
```

### 5. Docker実行（制限あり）
**注意**: Docker環境では音声合成に重大な制限があります。
- ナレーター・感情一覧の取得のみ可能
- **音声合成は利用不可**: Voicepeakのライセンス認証がコンテナ環境で無効化される
- ライセンス情報がホスト環境と分離されるため、認証が失敗する

## API仕様

### Voicepeak API

#### GET /api/narrators
利用可能なナレーター一覧を取得

#### GET /api/emotions
デフォルトナレーターの感情一覧を取得

#### GET /api/emotions/:narrator
指定ナレーターの感情一覧を取得

#### POST /api/synthesize
テキストを音声に変換
リクエスト例:
```json
{
  "text": "こんにちは",
  "narrator": "Miyamai Moca",
  "emotion": "honwaka",
  "speed": 120,
  "pitch": 50
}
```
レスポンス: WAVファイル（エラー時はJSON）

### VoiceVox互換API
**注意**: これらのエンドポイントは実際にはVoicepeakベースで実装されており、VoiceVoxエンジンとは独立して動作します。VoiceVoxエンジンが利用可能な場合は、環境設定に応じてVoiceVoxエンジンまたはVoicepeakを使用します。

#### GET /speakers
VoiceVoxスピーカー一覧を取得（Voicepeakナレーターをマッピング）

#### POST /audio_query
VoiceVoxオーディオクエリを作成（Voicepeakパラメータへ変換）
```json
{
  "text": "こんにちは",
  "speaker": "2041348160"
}
```

#### POST /synthesis?speaker={speakerId}
VoiceVox音声合成を実行（実際の音声生成はVoicepeakまたはVoiceVoxエンジンで実行）
リクエストボディ: audio_queryのレスポンス
レスポンス: WAVファイル

### 管理・情報API

#### GET /docs
Swagger UIによるAPI仕様書

## テスト方法

### APIサーバー起動確認
```bash
# Voicepeak API
curl http://localhost:3000/api/narrators

# VoiceVox互換API
curl http://localhost:3000/speakers
```

### Python仮想環境セットアップ
```bash
cd debug
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### テスト実行
```bash
# Voicepeak API全機能テスト
python3 test_api.py

# VoiceVox互換性テスト
python3 test_voicevox_compatibility.py

# セキュリティテスト
python3 test_security_suite.py --no-docker
```

## 使用例

### Voicepeak API

#### cURL
```bash
# ナレーター一覧取得
curl http://localhost:3000/api/narrators

# 音声合成
curl -X POST http://localhost:3000/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "こんにちは", "narrator": "Miyamai Moca", "emotion": "honwaka"}' \
  --output hello.wav
```

#### Python
```python
import requests

# ナレーター一覧取得
response = requests.get('http://localhost:3000/api/narrators')
narrators = response.json()['narrators']

# 音声合成
response = requests.post('http://localhost:3000/api/synthesize', json={
    'text': 'こんにちは',
    'narrator': 'Miyamai Moca',
    'emotion': 'honwaka'
})
if response.status_code == 200:
    with open('output.wav', 'wb') as f:
        f.write(response.content)
```

### VoiceVox互換API

#### cURL
```bash
# スピーカー一覧取得
curl http://localhost:3000/speakers

# オーディオクエリ作成
curl -X POST "http://localhost:3000/audio_query" \
  -H "Content-Type: application/json" \
  -d '{"text": "こんにちは", "speaker": "2041348160"}'

# 音声合成（オーディオクエリが必要）
curl -X POST "http://localhost:3000/synthesis?speaker=2041348160" \
  -H "Content-Type: application/json" \
  -d '{"accent_phrases": [...], "speedScale": 1.0, ...}' \
  --output voicevox_output.wav
```

#### Python
```python
import requests

# VoiceVox互換API使用例
base_url = "http://localhost:3000"

# スピーカー一覧取得
speakers = requests.get(f"{base_url}/speakers").json()
speaker_id = speakers[0]['styles'][0]['id']

# オーディオクエリ作成
audio_query = requests.post(f"{base_url}/audio_query", json={
    "text": "こんにちは",
    "speaker": str(speaker_id)
}).json()

# 音声合成
response = requests.post(f"{base_url}/synthesis?speaker={speaker_id}", json=audio_query)
if response.status_code == 200:
    with open('voicevox_output.wav', 'wb') as f:
        f.write(response.content)
```

### JavaScript (fetch)
```javascript
// Voicepeak API
fetch('http://localhost:3000/api/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        text: 'こんにちは', 
        narrator: 'Miyamai Moca',
        emotion: 'honwaka',
        speed: 110 
    })
})
.then(response => response.blob())
.then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.wav';
    a.click();
});
```

## サービス管理

### service-manager.sh
systemdサービスとして管理するためのスクリプト

```bash
# 使用方法
./service-manager.sh {install|uninstall|start|stop|restart|status|logs}

# サービス登録
sudo ./service-manager.sh install

# サービス開始
sudo ./service-manager.sh start

# サービス状態確認
./service-manager.sh status

# ログ確認（リアルタイム）
./service-manager.sh logs

# サービス停止
sudo ./service-manager.sh stop

# サービス解除
sudo ./service-manager.sh uninstall
```

### サービスの特徴
- 自動再起動設定
- systemd journalログ対応
- 環境変数自動設定
- Node.js（nvm）パス自動検出
- .envファイルからNODE_VERSION読み込み

## 注意事項
- 生成音声ファイルは一時保存後、自動削除
- Voicepeakのライセンス・パス設定必須
- VoiceVox Engine使用時はポート10101で起動が必要
- **Docker環境制限**: Docker内では音声合成が利用不可
  - Voicepeakのライセンス認証がコンテナ環境で無効化される
  - ライセンス情報の分離により認証が失敗する
  - ナレーター・感情一覧の取得のみ対応
- 完全な機能を利用するにはホスト側での実行を推奨
- 大量リクエスト時はサーバー負荷に注意
- systemdサービス登録にはsudo権限が必要
- VoiceVox互換APIは実際にはVoicepeakベースで実装

## トラブルシューティング

### よくある問題
1. **音声合成が失敗する**
   - ホスト側でVoicepeakが正常動作するか確認
   - .envのVOICEPEAK_HOST_PATHが正しいか確認
   - ファイルパスにスペースが含まれる場合は引用符で囲む

2. **APIサーバーが起動しない**
   - ポート3000が使用されていないか確認
   - Node.jsバージョンが22以上か確認
   - npm installが正常完了しているか確認

3. **VoiceVox互換APIが503エラー**
   - VoiceVox Engineがポート10101で起動しているか確認
   - 環境変数VOICEVOX_ENGINE_ENABLED=trueが設定されているか確認
   - VOICEVOX_ENGINE_URL=http://localhost:10101が正しく設定されているか確認

4. **systemdサービスが起動しない**
   - service-manager.shでinstallが正常完了しているか確認
   - sudo ./service-manager.sh status でエラー詳細を確認
   - journalctl -u voicepeak-api でログを確認

5. **Docker環境で音声合成が失敗する**
   - これは既知の制限です：Voicepeakのライセンス認証がコンテナ環境で無効化される
   - ライセンス情報がホスト環境と分離されるため認証が失敗する
   - 音声合成機能を使用する場合は、必ずホスト側での実行を使用してください
   - ナレーター・感情一覧の取得のみDocker環境で利用可能

### ログ確認方法
```bash
# systemdサービスのログ
sudo journalctl -u voicepeak-api -f

# サービス管理スクリプトでのログ確認
./service-manager.sh logs

# 手動起動時のログ
tail -f /tmp/voicepeak-api.log

# Docker実行のログ
docker-compose logs -f
```

## プロジェクト構成
```
voicepeek-api/
├── app/                     # Node.jsアプリ
│   ├── index.js            # メインサーバー
│   ├── security.js         # セキュリティ機能
│   ├── swagger.js          # API仕様書
│   ├── voicevox-adapter.js # VoiceVox互換アダプター
│   ├── package.json        # 依存関係
│   ├── .env                # 環境変数
│   ├── .env.example        # 環境変数テンプレート
│   └── temp/               # 一時音声ファイル
├── debug/                   # テストスクリプト
│   ├── test_api.py         # Voicepeak APIテスト
│   ├── test_voicevox_compatibility.py # VoiceVox互換テスト
│   ├── test_security_suite.py # セキュリティテスト
│   ├── requirements.txt    # Python依存関係
│   └── tmp/                # テスト用一時ファイル
├── service-manager.sh       # systemdサービス管理
├── voicepeak-api.sh        # 従来の管理スクリプト
├── Dockerfile              # Dockerイメージ
├── docker-compose.yml      # Docker Compose
└── README.md               # このファイル
```

## 環境変数

### サーバー用設定（.env）
```env
# 基本設定
NODE_ENV=production
PORT=3000
DEFAULT_ENGINE=voicepeak

# Node.js設定
NODE_VERSION=v22.19.0

# Voicepeak設定
VOICEPEAK_HOST_PATH="/home/user/Documents/Voicepeak Downloads/Voicepeak-linux64/Voicepeak"

# VoiceVox設定（オプション）
VOICEVOX_ENGINE_ENABLED=true
VOICEVOX_ENGINE_URL=http://localhost:10101

# 個別機能でのVoiceVox使用設定
USE_VOICEVOX_FOR_NARRATORS=true
USE_VOICEVOX_FOR_EMOTIONS=true
USE_VOICEVOX_FOR_SYNTHESIS=false
```

### 重要な設定項目
- `VOICEPEAK_HOST_PATH`: Voicepeakディレクトリの絶対パス
- `PORT`: APIサーバーのポート番号（デフォルト：3000）
- `NODE_ENV`: 実行環境（production/development）
- `NODE_VERSION`: 使用するNode.jsバージョン（service-manager.sh用、デフォルト：v22.19.0）
- `DEFAULT_ENGINE`: デフォルトエンジン（voicepeak/voicevox）
- `VOICEVOX_ENGINE_ENABLED`: VoiceVox互換機能の有効化
- `VOICEVOX_ENGINE_URL`: VoiceVox Engineの接続URL（ポート10101）
- `USE_VOICEVOX_FOR_*`: 各機能でのVoiceVox使用を個別制御

### テスト用設定（debug/.env.test）
```env
API_LOCAL_URL=http://localhost:3000/api
TEST_TIMEOUT=30
TEST_MAX_RETRIES=3
DEBUG_MODE=0
```

## 実行方法まとめ

### 1. 推奨：systemdサービス
```bash
sudo ./service-manager.sh install
sudo ./service-manager.sh start
# 自動再起動、ログ管理、権限管理
```

### 2. 手動実行
```bash
cd voicepeek-api/app
VOICEPEAK_HOST_PATH="/path/to/voicepeak" node index.js
```

### 3. 管理スクリプト
```bash
./voicepeak-api.sh start
# プロセス管理、PIDファイル管理
```

## ライセンス
このプロジェクトはMITライセンスの下で提供されています。

## 貢献
プルリクエストやイシューの報告を歓迎します。