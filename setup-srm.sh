
#!/usr/bin/env bash
set -Eeuo pipefail

SERVICE="srm-login.service"
TIMER="srm-login.timer"
UNIT_DIR="/etc/systemd/system"

# Detect the project directory from this script's location.
PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
INDEX_JS="$PROJECT_DIR/index.js"
NODE_BIN="$(command -v node || true)"
CURRENT_USER="$(id -un)"
USER_HOME="$HOME"

die() {
    echo "Error: $*" >&2
    exit 1
}

escape_systemd() {
    local value="$1"
    value="${value//\\/\\\\}"
    value="${value//\"/\\\"}"
    printf '%s' "$value"
}

install_srm() {
    [[ -f "$INDEX_JS" ]] || die "index.js not found at $INDEX_JS"
    [[ -n "$NODE_BIN" ]] || die "Node.js not found. Install it first."

    echo
    echo "Project: $PROJECT_DIR"
    echo "Node.js: $NODE_BIN"
    echo

    read -r -p "SRM username: " username
    [[ -n "$username" ]] || die "Username cannot be empty."

    read -r -s -p "SRM password: " password
    echo
    [[ -n "$password" ]] || die "Password cannot be empty."

    # Prevent unsupported multiline credentials.
    [[ "$username" != *$'\n'* && "$password" != *$'\n'* ]] ||
        die "Credentials must not contain newline characters."

    local escaped_user escaped_password
    escaped_user="$(escape_systemd "$username")"
    escaped_password="$(escape_systemd "$password")"

    local temp_service temp_timer
    temp_service="$(mktemp)"
    temp_timer="$(mktemp)"
    chmod 600 "$temp_service" "$temp_timer"

    # Do not retain credentials in shell variables longer than needed.
    unset username password

    cat > "$temp_service" <<EOF
[Unit]
Description=SRM Captive Portal Login
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
User=$CURRENT_USER
WorkingDirectory=$PROJECT_DIR
Environment="HOME=$USER_HOME"
Environment="SRM_USERNAME=$escaped_user"
Environment="SRM_PASSWORD=$escaped_password"
ExecStart=$NODE_BIN $INDEX_JS
EOF

    cat > "$temp_timer" <<EOF
[Unit]
Description=Check SRM Internet Access Every 30 Minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=30min
Persistent=true
Unit=$SERVICE

[Install]
WantedBy=timers.target
EOF

    # Remove temporary copies when finished.
    unset escaped_user escaped_password

    sudo install -o root -g root -m 600 \
        "$temp_service" "$UNIT_DIR/$SERVICE"
    sudo install -o root -g root -m 644 \
        "$temp_timer" "$UNIT_DIR/$TIMER"

    rm -f "$temp_service" "$temp_timer"

    sudo systemctl daemon-reload
    sudo systemctl enable --now "$TIMER"

    echo
    echo "Timer installed and enabled."
    echo "Running the login service once now..."

    if sudo systemctl start "$SERVICE"; then
        echo "Service execution finished."
    else
        echo "Service failed. Inspect its logs below."
    fi

    sudo journalctl -u "$SERVICE" -n 20 --no-pager || true

    echo
    echo "Next scheduled run:"
    systemctl list-timers "$TIMER" --no-pager || true
}

remove_srm() {
    echo
    read -r -p "Remove the SRM systemd service and timer? [y/N] " answer

    case "$answer" in
        y|Y|yes|YES) ;;
        *)
            echo "Cancelled."
            return
            ;;
    esac

    sudo systemctl disable --now "$TIMER" 2>/dev/null || true
    sudo systemctl stop "$SERVICE" 2>/dev/null || true

    sudo rm -f "$UNIT_DIR/$SERVICE" "$UNIT_DIR/$TIMER"

    sudo systemctl daemon-reload
    sudo systemctl reset-failed "$SERVICE" "$TIMER" 2>/dev/null || true

    echo "SRM timer and service removed."
    echo "Your index.js and project files were not deleted."
}

while true; do
    echo
    echo "================================"
    echo "     SRM Login Setup Utility"
    echo "================================"
    echo "1. Install / Configure"
    echo "2. Remove from systemd"
    echo "3. Exit"
    echo

    read -r -p "Choose an option [1-3]: " choice

    case "$choice" in
        1) install_srm ;;
        2) remove_srm ;;
        3) echo "Exiting."; exit 0 ;;
        *) echo "Invalid option. Choose 1, 2, or 3." ;;
    esac
done
