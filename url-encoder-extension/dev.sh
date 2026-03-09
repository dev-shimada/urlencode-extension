#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------
# URL Encoder Extension - ローカル開発用スクリプト
# 対応環境: Debian / Ubuntu
# -----------------------------------------------
# 使い方:
#   ./dev.sh setup              必要なツールをインストール
#   ./dev.sh build              ビルド (dist/ を生成)
#   ./dev.sh package            .zip を生成
#   ./dev.sh clean              dist/ と release/ を削除
#   ./dev.sh help               このヘルプを表示
# -----------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---- カラー出力 ----
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

info()    { echo -e "${CYAN}[info]${RESET} $*"; }
success() { echo -e "${GREEN}[ok]${RESET}  $*"; }
warn()    { echo -e "${YELLOW}[warn]${RESET} $*"; }
error()   { echo -e "${RED}[error]${RESET} $*" >&2; }

# ---- 特権コマンド実行 ----
run_privileged() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo &>/dev/null; then
    sudo "$@"
  else
    error "root権限が必要ですが sudo が使えません: $*"
    exit 1
  fi
}

# ---- apt インストールヘルパー ----
apt_install() {
  run_privileged apt-get install -y "$@"
}

# ---- Node.js のインストール ----
ensure_node() {
  if command -v node &>/dev/null && command -v npm &>/dev/null; then
    return 0
  fi
  info "Node.js が見つかりません。インストールします..."
  run_privileged apt-get update -q
  # NodeSource 経由で LTS をインストール
  curl -fsSL https://deb.nodesource.com/setup_lts.x | run_privileged bash -
  apt_install nodejs
  success "Node.js をインストールしました ($(node --version))"
}

# ---- make のインストール ----
ensure_make() {
  if command -v make &>/dev/null; then
    return 0
  fi
  info "make が見つかりません。インストールします..."
  run_privileged apt-get update -q
  apt_install make
  success "make をインストールしました"
}

# ---- zip のインストール ----
ensure_zip() {
  if command -v zip &>/dev/null; then
    return 0
  fi
  info "zip が見つかりません。インストールします..."
  run_privileged apt-get update -q
  apt_install zip
  success "zip をインストールしました"
}

# ---- setup: 必要なツールをすべてインストール ----
cmd_setup() {
  info "セットアップを開始します..."
  ensure_node
  ensure_make
  ensure_zip
  success "セットアップ完了"
}

# ---- build ----
cmd_build() {
  ensure_node

  if [ ! -d node_modules ]; then
    info "node_modules が見つかりません。npm install を実行します..."
    npm install
  fi

  info "ビルド開始..."
  npm run build
  success "ビルド完了 → dist/"
}

# ---- package ----
cmd_package() {
  ensure_zip

  if [ ! -d dist ]; then
    warn "dist/ が見つかりません。先にビルドを実行します..."
    cmd_build
  fi

  node scripts/package.js

  success "パッケージング完了 → release/"
  echo ""
  ls -lh release/ 2>/dev/null || true
}

# ---- clean ----
cmd_clean() {
  info "dist/ と release/ を削除します..."
  rm -rf dist/ release/
  success "クリーン完了"
}

# ---- help ----
cmd_help() {
  echo ""
  echo "  使い方: ./dev.sh <command>"
  echo ""
  echo "  コマンド:"
  echo "    setup              Node.js / make / zip を自動インストール"
  echo "    build              TypeScript をコンパイルして dist/ を生成"
  echo "    package            .zip を release/ に生成"
  echo "    clean              dist/ と release/ を削除"
  echo "    help               このヘルプを表示"
  echo ""
  echo "  例:"
  echo "    ./dev.sh setup"
  echo "    ./dev.sh build"
  echo "    ./dev.sh package"
  echo ""
}

# ---- エントリポイント ----
COMMAND="${1:-help}"

case "$COMMAND" in
  setup)   cmd_setup ;;
  build)   cmd_build ;;
  package) cmd_package ;;
  clean)   cmd_clean ;;
  help|-h|--help) cmd_help ;;
  *)
    error "不明なコマンド: $COMMAND"
    cmd_help
    exit 1
    ;;
esac
