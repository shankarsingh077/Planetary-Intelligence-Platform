#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# 🌍 PLANETARY INTELLIGENCE PLATFORM — Single-Command Launcher
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage:   ./start.sh          (normal start)
#          ./start.sh --kill    (kill everything)
#          ./start.sh --status  (check what's running)
#
# This script:
#   1. Kills any existing backend/frontend processes on ports 8080 & 5173
#   2. Loads all API keys from .env.live.local
#   3. Sets up Python venv if needed
#   4. Starts the backend API server (uvicorn on port 8080)
#   5. Starts the frontend dev server (Vite on port 5173)
#   6. Runs a quick health check to verify all data sources
#   7. Opens the browser automatically
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Project Root ─────────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/services/experience-plane/triage-api"
FRONTEND_DIR="$PROJECT_ROOT/services/experience-plane/triage-web-v2"
ENV_FILE="$PROJECT_ROOT/.env.live.local"
BACKEND_PORT=8080
FRONTEND_PORT=5173
LOG_DIR="$PROJECT_ROOT/.logs"

banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}🌍 PLANETARY INTELLIGENCE PLATFORM${NC}                          ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${BLUE}Global Situational Awareness Engine${NC}                         ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ─── Kill existing processes ──────────────────────────────────────────────────
kill_existing() {
    echo -e "${YELLOW}⚡ Killing existing processes on ports $BACKEND_PORT and $FRONTEND_PORT...${NC}"
    
    # Kill backend
    local backend_pids=$(lsof -ti :$BACKEND_PORT 2>/dev/null || true)
    if [ -n "$backend_pids" ]; then
        echo "$backend_pids" | xargs kill -9 2>/dev/null || true
        echo -e "  ${RED}✗${NC} Killed backend processes: $backend_pids"
    else
        echo -e "  ${GREEN}✓${NC} No backend process on port $BACKEND_PORT"
    fi

    # Kill frontend
    local frontend_pids=$(lsof -ti :$FRONTEND_PORT 2>/dev/null || true)
    if [ -n "$frontend_pids" ]; then
        echo "$frontend_pids" | xargs kill -9 2>/dev/null || true
        echo -e "  ${RED}✗${NC} Killed frontend processes: $frontend_pids"
    else
        echo -e "  ${GREEN}✓${NC} No frontend process on port $FRONTEND_PORT"
    fi

    sleep 1
}

# ─── Load environment ────────────────────────────────────────────────────────
load_env() {
    echo -e "${YELLOW}🔑 Loading API keys from .env.live.local...${NC}"
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "  ${RED}✗ $ENV_FILE not found!${NC}"
        echo -e "  ${YELLOW}Copy .env.staging.example → .env.live.local and add your keys${NC}"
        exit 1
    fi

    set -a
    source "$ENV_FILE"
    set +a

    # Verify critical keys
    local keys_ok=true
    for key in GEMINI_API_KEY FINNHUB_API_KEY NASA_FIRMS_API_KEY FRED_API_KEY EIA_API_KEY; do
        val="${!key}"
        if [ -n "$val" ]; then
            echo -e "  ${GREEN}✓${NC} $key = ${val:0:8}...${val: -4}"
        else
            echo -e "  ${RED}✗${NC} $key = ${RED}NOT SET${NC}"
            keys_ok=false
        fi
    done

    if [ "$keys_ok" = false ]; then
        echo -e "\n  ${YELLOW}⚠ Some API keys are missing. Panels will show DEMO data for those sources.${NC}"
    fi
    echo ""
}

# ─── Setup Python venv ───────────────────────────────────────────────────────
setup_backend() {
    echo -e "${YELLOW}🐍 Setting up backend...${NC}"
    
    if [ ! -d "$BACKEND_DIR/.venv" ]; then
        echo -e "  Creating Python virtual environment..."
        python3 -m venv "$BACKEND_DIR/.venv"
        echo -e "  Installing dependencies..."
        "$BACKEND_DIR/.venv/bin/pip" install -q -e "$BACKEND_DIR" \
            -e "$PROJECT_ROOT/services/intelligence-plane/brief-service" \
            -e "$PROJECT_ROOT/services/intelligence-plane/fusion-service" \
            -e "$PROJECT_ROOT/services/intelligence-plane/confidence-service" \
            -e "$PROJECT_ROOT/services/intelligence-plane/entity-resolver" \
            httpx 2>/dev/null
        echo -e "  ${GREEN}✓${NC} Virtual environment created and dependencies installed"
    else
        echo -e "  ${GREEN}✓${NC} Virtual environment exists"
    fi

    # Check if httpx is installed
    if ! "$BACKEND_DIR/.venv/bin/pip" show httpx >/dev/null 2>&1; then
        echo -e "  Installing httpx..."
        "$BACKEND_DIR/.venv/bin/pip" install -q httpx 2>/dev/null
    fi
    echo ""
}

# ─── Start Backend ───────────────────────────────────────────────────────────
start_backend() {
    echo -e "${YELLOW}🚀 Starting backend API server (port $BACKEND_PORT)...${NC}"
    
    mkdir -p "$LOG_DIR"
    
    cd "$BACKEND_DIR"
    "$BACKEND_DIR/.venv/bin/python" -m uvicorn triage_api.app:app \
        --host 0.0.0.0 \
        --port $BACKEND_PORT \
        --reload \
        > "$LOG_DIR/backend.log" 2>&1 &
    
    BACKEND_PID=$!
    echo "$BACKEND_PID" > "$LOG_DIR/backend.pid"
    echo -e "  ${GREEN}✓${NC} Backend starting (PID: $BACKEND_PID)"
    echo -e "  ${BLUE}→${NC} Log: $LOG_DIR/backend.log"

    # Wait for backend to be ready
    echo -ne "  Waiting for backend..."
    for i in {1..30}; do
        if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
            echo -e " ${GREEN}READY${NC}"
            return 0
        fi
        echo -ne "."
        sleep 1
    done
    echo -e " ${RED}TIMEOUT${NC}"
    echo -e "  ${YELLOW}Check logs: tail -50 $LOG_DIR/backend.log${NC}"
    return 1
}

# ─── Start Frontend ──────────────────────────────────────────────────────────
start_frontend() {
    echo -e "${YELLOW}🎨 Starting frontend dev server (port $FRONTEND_PORT)...${NC}"
    
    cd "$FRONTEND_DIR"
    
    # Install npm deps if needed
    if [ ! -d "node_modules" ]; then
        echo -e "  Installing npm dependencies..."
        npm install --silent 2>/dev/null
    fi

    npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > "$LOG_DIR/frontend.pid"
    echo -e "  ${GREEN}✓${NC} Frontend starting (PID: $FRONTEND_PID)"
    echo -e "  ${BLUE}→${NC} Log: $LOG_DIR/frontend.log"

    # Wait for frontend
    echo -ne "  Waiting for frontend..."
    for i in {1..20}; do
        if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
            echo -e " ${GREEN}READY${NC}"
            return 0
        fi
        echo -ne "."
        sleep 1
    done
    echo -e " ${GREEN}READY${NC} (assumed)"
    echo ""
}

# ─── Health Check ─────────────────────────────────────────────────────────────
health_check() {
    echo -e "${YELLOW}🩺 Running health check...${NC}"
    
    local health=$(curl -s http://localhost:$BACKEND_PORT/health 2>/dev/null)
    if [ -z "$health" ]; then
        echo -e "  ${RED}✗ Backend not responding${NC}"
        return 1
    fi

    # Parse health response
    echo "$health" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    sources = d.get('data_sources', {})
    cache = d.get('cache', {})
    
    for name, info in sources.items():
        configured = info.get('configured', False)
        last_success = info.get('last_success')
        icon = '✓' if configured else '✗'
        color = '\033[0;32m' if configured else '\033[0;31m'
        status = 'LIVE' if last_success else ('CONFIGURED' if configured else 'MISSING')
        print(f'  {color}{icon}\033[0m {name}: {status}')
    
    print(f'\n  Cache: {cache.get(\"entries\", 0)} entries cached')
    if cache.get('keys'):
        print(f'  Keys: {\", \".join(cache[\"keys\"])}')
except:
    print('  Could not parse health response')
" 2>/dev/null

    echo ""
}

# ─── Status ───────────────────────────────────────────────────────────────────
show_status() {
    echo -e "${YELLOW}📊 System Status:${NC}"
    
    local backend_running=false
    local frontend_running=false

    if lsof -ti :$BACKEND_PORT > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Backend running on port $BACKEND_PORT"
        backend_running=true
    else
        echo -e "  ${RED}✗${NC} Backend not running"
    fi

    if lsof -ti :$FRONTEND_PORT > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Frontend running on port $FRONTEND_PORT"
        frontend_running=true
    else
        echo -e "  ${RED}✗${NC} Frontend not running"
    fi

    if [ "$backend_running" = true ]; then
        echo ""
        health_check
    fi
}

# ─── Open Browser ─────────────────────────────────────────────────────────────
open_browser() {
    echo -e "${CYAN}🌐 Opening browser...${NC}"
    sleep 2
    open "http://localhost:$FRONTEND_PORT" 2>/dev/null || true
}

# ─── Summary ──────────────────────────────────────────────────────────────────
print_summary() {
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}  🌍 PLATFORM IS LIVE!${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${GREEN}Frontend:${NC}  http://localhost:$FRONTEND_PORT"
    echo -e "  ${GREEN}Backend:${NC}   http://localhost:$BACKEND_PORT"
    echo -e "  ${GREEN}Health:${NC}    http://localhost:$BACKEND_PORT/health"
    echo -e "  ${GREEN}AI Brief:${NC}  curl -X POST http://localhost:$BACKEND_PORT/v1/ai/brief"
    echo ""
    echo -e "  ${YELLOW}Commands:${NC}"
    echo -e "    ./start.sh --status   Check system status"
    echo -e "    ./start.sh --kill     Stop everything"
    echo -e "    tail -f .logs/backend.log   Watch backend logs"
    echo ""
    echo -e "  ${BLUE}Press Ctrl+C to stop both servers${NC}"
    echo ""
}

# ─── Ctrl+C handler ──────────────────────────────────────────────────────────
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    kill_existing
    echo -e "${GREEN}Done.${NC}"
    exit 0
}

trap cleanup INT TERM

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

banner

case "${1:-}" in
    --kill|-k)
        kill_existing
        echo -e "${GREEN}All processes stopped.${NC}"
        exit 0
        ;;
    --status|-s)
        show_status
        exit 0
        ;;
esac

# Full startup sequence
kill_existing
load_env
setup_backend
start_backend
start_frontend
health_check
print_summary
open_browser

# Keep script alive to catch Ctrl+C
wait
