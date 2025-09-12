#!/bin/bash
# Voicepeak API Server Control Script

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"
PID_FILE="$SCRIPT_DIR/voicepeak-api.pid"
LOG_FILE="$SCRIPT_DIR/voicepeak-api.log"

# 色付きログ関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

log_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

# サーバーのステータス確認
status() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_info "Voicepeak APIサーバーは実行中です (PID: $pid)"
            log_info "ログファイル: $LOG_FILE"
            return 0
        else
            log_warn "PIDファイルは存在しますが、プロセスが見つかりません"
            rm -f "$PID_FILE"
            return 1
        fi
    else
        log_info "Voicepeak APIサーバーは停止中です"
        return 1
    fi
}

# Voicepeakの存在確認
check_voicepeak() {
    local voicepeak_path="$HOME/Documents/Voicepeak Downloads/Voicepeak-linux64/Voicepeak/voicepeak"
    
    if [ ! -f "$voicepeak_path" ]; then
        log_error "Voicepeakが見つかりません: $voicepeak_path"
        log_info "Voicepeakをインストールしてパスを確認してください"
        return 1
    fi
    
    log_info "Voicepeak確認完了: $voicepeak_path"
    return 0
}

# Node.jsの存在確認
check_nodejs() {
    if ! command -v node &> /dev/null; then
        log_error "Node.jsがインストールされていません"
        log_info "Node.jsをインストールしてください: https://nodejs.org/"
        return 1
    fi
    
    local node_version=$(node --version)
    log_info "Node.js確認完了: $node_version"
    return 0
}

# 依存関係の確認とインストール
install_dependencies() {
    if [ ! -d "$APP_DIR/node_modules" ]; then
        log_info "依存関係をインストール中..."
        cd "$APP_DIR"
        npm install
        if [ $? -ne 0 ]; then
            log_error "依存関係のインストールに失敗しました"
            return 1
        fi
    else
        log_info "依存関係確認完了"
    fi
    return 0
}

# サーバー起動
start() {
    if status > /dev/null 2>&1; then
        log_warn "Voicepeak APIサーバーは既に実行中です"
        return 1
    fi
    
    log_info "Voicepeak APIサーバーを起動中..."
    
    # 各種チェック
    if ! check_nodejs; then
        return 1
    fi
    
    if ! check_voicepeak; then
        return 1
    fi
    
    cd "$APP_DIR"
    
    if ! install_dependencies; then
        return 1
    fi
    
    # app/.envファイルの環境変数を読み込み
    if [ -f "$APP_DIR/.env" ]; then
        log_info "環境設定を $APP_DIR/.env から読み込み中..."
        set -a
        source "$APP_DIR/.env"
        set +a
        log_info "環境変数読み込み完了"
    else
        log_warn "$APP_DIR/.env ファイルが見つかりません"
    fi
    
    # VOICEPEAK_HOST_PATHの展開（${HOME}などの変数を解決）
    if [ -n "$VOICEPEAK_HOST_PATH" ]; then
        VOICEPEAK_HOST_PATH=$(eval echo "$VOICEPEAK_HOST_PATH")
        export VOICEPEAK_HOST_PATH
        log_info "VOICEPEAK_HOST_PATH: $VOICEPEAK_HOST_PATH"
    else
        log_error "VOICEPEAK_HOST_PATH が設定されていません。app/.env ファイルを確認してください。"
        return 1
    fi
    
    # バックグラウンドでNode.jsサーバー起動
    nohup node index.js > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"
    
    sleep 2
    
    # 起動確認
    if ps -p "$pid" > /dev/null 2>&1; then
        log_success "Voicepeak APIサーバーが起動しました (PID: $pid)"
        log_info "ポート: 3000"
        log_info "ログファイル: $LOG_FILE"
        log_info "停止するには: $0 stop"
        return 0
    else
        log_error "サーバーの起動に失敗しました"
        rm -f "$PID_FILE"
        return 1
    fi
}

# サーバー停止
stop() {
    if ! status > /dev/null 2>&1; then
        log_warn "Voicepeak APIサーバーは実行されていません"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    log_info "Voicepeak APIサーバーを停止中... (PID: $pid)"
    
    kill "$pid"
    sleep 2
    
    # 強制終了が必要な場合
    if ps -p "$pid" > /dev/null 2>&1; then
        log_warn "通常の停止に失敗しました。強制終了します..."
        kill -9 "$pid"
        sleep 1
    fi
    
    if ! ps -p "$pid" > /dev/null 2>&1; then
        rm -f "$PID_FILE"
        log_success "Voicepeak APIサーバーが停止しました"
        return 0
    else
        log_error "サーバーの停止に失敗しました"
        return 1
    fi
}

# サーバー再起動
restart() {
    log_info "Voicepeak APIサーバーを再起動中..."
    stop
    sleep 1
    start
}

# ログ表示
logs() {
    if [ ! -f "$LOG_FILE" ]; then
        log_warn "ログファイルが見つかりません: $LOG_FILE"
        return 1
    fi
    
    if [ "$1" = "-f" ] || [ "$1" = "--follow" ]; then
        log_info "ログをリアルタイム表示中... (Ctrl+Cで終了)"
        tail -f "$LOG_FILE"
    else
        log_info "最新のログを表示:"
        tail -n 50 "$LOG_FILE"
    fi
}

# ヘルプ表示
help() {
    echo "Voicepeak API Server Control Script"
    echo ""
    echo "使用方法:"
    echo "  $0 {start|stop|restart|status|logs|help}"
    echo ""
    echo "コマンド:"
    echo "  start    - サーバーをバックグラウンドで起動"
    echo "  stop     - サーバーを停止"
    echo "  restart  - サーバーを再起動"
    echo "  status   - サーバーの状態を確認"
    echo "  logs     - ログを表示"
    echo "  logs -f  - ログをリアルタイム表示"
    echo "  help     - このヘルプを表示"
    echo ""
}

# メイン処理
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs "$2"
        ;;
    help|--help|-h)
        help
        ;;
    *)
        log_error "無効なコマンド: $1"
        help
        exit 1
        ;;
esac

exit $?