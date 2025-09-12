#!/bin/bash
# Voicepeak API Server Service Management Script

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="voicepeak-api"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
USER_NAME="${SUDO_USER:-$(whoami)}"
WORKING_DIR="$SCRIPT_DIR/app"
ENV_FILE="$WORKING_DIR/.env"

# .envファイルから環境変数を読み込む
load_env_file() {
    if [ -f "$ENV_FILE" ]; then
        log_info ".envファイルから設定を読み込み中..."
        # .envファイルの内容を読み込み（コメント行と空行を除く）
        while IFS= read -r line; do
            # コメント行と空行をスキップ
            if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
                continue
            fi
            # 変数展開を処理してエクスポート
            if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
                eval "export $line"
            fi
        done < "$ENV_FILE"
    else
        log_warn ".envファイルが見つかりません: $ENV_FILE"
        log_warn "デフォルト値を使用します"
    fi
}

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

# root権限チェック
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "このスクリプトはsudo権限で実行する必要があります"
        exit 1
    fi
}

# systemdサービスファイルを作成
create_service_file() {
    log_info "systemdサービスファイルを作成中..."
    
    # 環境変数を読み込み
    load_env_file
    
    # NODE_VERSIONのデフォルト値を設定
    if [ -z "$NODE_VERSION" ]; then
        NODE_VERSION="v22.19.0"
        log_warn "NODE_VERSIONが設定されていません。デフォルト値 $NODE_VERSION を使用します"
    fi
    
    # Node.jsの実行パスを取得
    local node_path
    if [ -f "/home/$USER_NAME/.nvm/versions/node/$NODE_VERSION/bin/node" ]; then
        node_path="/home/$USER_NAME/.nvm/versions/node/$NODE_VERSION/bin/node"
        log_info "nvm Node.js $NODE_VERSION を使用: $node_path"
    elif command -v node &> /dev/null; then
        node_path=$(command -v node)
        log_info "システムNode.jsを使用: $node_path"
    else
        node_path="/usr/bin/node"
        log_warn "Node.jsが見つかりません。デフォルトパス $node_path を使用します"
    fi
    
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Voicepeak API Server
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$WORKING_DIR
Environment=NODE_ENV=production
Environment="VOICEPEAK_HOST_PATH=/home/$USER_NAME/Documents/Voicepeak Downloads/Voicepeak-linux64/Voicepeak"
Environment=VOICEVOX_ENGINE_ENABLED=true
Environment=VOICEVOX_ENGINE_URL=http://localhost:10101
Environment=PATH=/home/$USER_NAME/.nvm/versions/node/$NODE_VERSION/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=$node_path index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=voicepeak-api

[Install]
WantedBy=multi-user.target
EOF

    if [ $? -eq 0 ]; then
        log_success "サービスファイル作成完了: $SERVICE_FILE"
    else
        log_error "サービスファイル作成に失敗しました"
        exit 1
    fi
}

# サービスを登録
install_service() {
    check_root
    
    log_info "Voicepeak API をsystemdサービスとして登録中..."
    
    # 環境変数を読み込み
    load_env_file
    
    # NODE_VERSIONのデフォルト値を設定
    if [ -z "$NODE_VERSION" ]; then
        NODE_VERSION="v22.19.0"
        log_warn "NODE_VERSIONが設定されていません。デフォルト値 $NODE_VERSION を使用します"
    fi
    
    # Nodeの存在確認
    local node_path
    if [ -f "/home/$USER_NAME/.nvm/versions/node/$NODE_VERSION/bin/node" ]; then
        node_path="/home/$USER_NAME/.nvm/versions/node/$NODE_VERSION/bin/node"
    elif command -v node &> /dev/null; then
        node_path=$(command -v node)
    else
        log_error "Node.js (バージョン $NODE_VERSION) がインストールされていません"
        log_error "nvmでNode.js $NODE_VERSION をインストールするか、NODE_VERSIONを変更してください"
        exit 1
    fi
    log_info "Node.js path: $node_path"
    
    # アプリケーションディレクトリの確認
    if [ ! -d "$WORKING_DIR" ]; then
        log_error "アプリケーションディレクトリが見つかりません: $WORKING_DIR"
        exit 1
    fi
    
    # index.jsの確認
    if [ ! -f "$WORKING_DIR/index.js" ]; then
        log_error "index.jsが見つかりません: $WORKING_DIR/index.js"
        exit 1
    fi
    
    # 既存サービスのチェック
    if systemctl is-enabled "$SERVICE_NAME" &> /dev/null; then
        log_warn "サービス '$SERVICE_NAME' は既に登録されています"
        read -p "上書きしますか？ (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "登録をキャンセルしました"
            exit 0
        fi
        
        # 既存サービスを停止
        log_info "既存サービスを停止中..."
        systemctl stop "$SERVICE_NAME" 2>/dev/null
    fi
    
    # サービスファイル作成
    create_service_file
    
    # systemd reload
    log_info "systemd設定を再読み込み中..."
    systemctl daemon-reload
    
    # サービス有効化
    log_info "サービスを有効化中..."
    systemctl enable "$SERVICE_NAME"
    
    if [ $? -eq 0 ]; then
        log_success "Voicepeak API サービスが正常に登録されました"
        log_info "サービス開始: sudo systemctl start $SERVICE_NAME"
        log_info "サービス停止: sudo systemctl stop $SERVICE_NAME"
        log_info "サービス状態: sudo systemctl status $SERVICE_NAME"
        log_info "ログ確認: sudo journalctl -u $SERVICE_NAME -f"
    else
        log_error "サービス登録に失敗しました"
        exit 1
    fi
}

# サービスを解除
uninstall_service() {
    check_root
    
    log_info "Voicepeak API サービスを解除中..."
    
    # サービスの存在確認
    if ! systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
        log_warn "サービス '$SERVICE_NAME' は登録されていません"
        exit 0
    fi
    
    # サービス停止
    log_info "サービスを停止中..."
    systemctl stop "$SERVICE_NAME" 2>/dev/null
    
    # サービス無効化
    log_info "サービスを無効化中..."
    systemctl disable "$SERVICE_NAME" 2>/dev/null
    
    # サービスファイル削除
    if [ -f "$SERVICE_FILE" ]; then
        log_info "サービスファイルを削除中..."
        rm -f "$SERVICE_FILE"
    fi
    
    # systemd reload
    log_info "systemd設定を再読み込み中..."
    systemctl daemon-reload
    
    log_success "Voicepeak API サービスが正常に解除されました"
}

# サービス開始
start_service() {
    check_root
    
    if ! systemctl is-enabled "$SERVICE_NAME" &> /dev/null; then
        log_error "サービス '$SERVICE_NAME' が登録されていません"
        log_info "まず 'sudo $0 install' でサービスを登録してください"
        exit 1
    fi
    
    log_info "Voicepeak API サービスを開始中..."
    systemctl start "$SERVICE_NAME"
    
    if [ $? -eq 0 ]; then
        log_success "サービスが開始されました"
        sleep 2
        systemctl status "$SERVICE_NAME" --no-pager
    else
        log_error "サービス開始に失敗しました"
        exit 1
    fi
}

# サービス停止
stop_service() {
    check_root
    
    if ! systemctl is-enabled "$SERVICE_NAME" &> /dev/null; then
        log_error "サービス '$SERVICE_NAME' が登録されていません"
        exit 1
    fi
    
    log_info "Voicepeak API サービスを停止中..."
    systemctl stop "$SERVICE_NAME"
    
    if [ $? -eq 0 ]; then
        log_success "サービスが停止されました"
    else
        log_error "サービス停止に失敗しました"
        exit 1
    fi
}

# サービス状態確認
status_service() {
    if systemctl is-enabled "$SERVICE_NAME" &> /dev/null; then
        log_info "サービス状態:"
        systemctl status "$SERVICE_NAME" --no-pager
        echo
        log_info "最新ログ:"
        journalctl -u "$SERVICE_NAME" --no-pager -n 20
    else
        log_warn "サービス '$SERVICE_NAME' は登録されていません"
    fi
}

# ログ表示
logs_service() {
    if systemctl is-enabled "$SERVICE_NAME" &> /dev/null; then
        log_info "サービスログを表示中... (Ctrl+C で終了)"
        journalctl -u "$SERVICE_NAME" -f
    else
        log_warn "サービス '$SERVICE_NAME' は登録されていません"
    fi
}

# 使用方法表示
show_usage() {
    echo "Voicepeak API Server Service Management"
    echo
    echo "使用方法: $0 {install|uninstall|start|stop|restart|status|logs}"
    echo
    echo "コマンド:"
    echo "  install    - systemdサービスとして登録"
    echo "  uninstall  - systemdサービスを解除"
    echo "  start      - サービス開始"
    echo "  stop       - サービス停止"
    echo "  restart    - サービス再起動"
    echo "  status     - サービス状態確認"
    echo "  logs       - ログ表示 (リアルタイム)"
    echo
    echo "注意: install, uninstall, start, stop, restart はsudo権限が必要です"
}

# メイン処理
case "$1" in
    install)
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        check_root
        stop_service
        sleep 2
        start_service
        ;;
    status)
        status_service
        ;;
    logs)
        logs_service
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

exit 0