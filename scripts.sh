#!/bin/bash

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_BIN="${DOCKER_BIN:-docker}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
API_URL="${API_URL:-http://localhost:8000}"

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

run_compose() {
    (cd "${PROJECT_ROOT}" && "${DOCKER_BIN}" compose -f "${COMPOSE_FILE}" "$@")
}

check_docker() {
    if ! command -v "${DOCKER_BIN}" >/dev/null 2>&1; then
        print_error "Docker nao foi encontrado no PATH."
        exit 1
    fi

    if ! "${DOCKER_BIN}" info >/dev/null 2>&1; then
        print_error "Docker nao esta em execucao ou nao esta acessivel."
        exit 1
    fi
}

open_frontend() {
    if command -v open >/dev/null 2>&1; then
        print_status "Abrindo ${FRONTEND_URL} no navegador padrao..."
        open "${FRONTEND_URL}" >/dev/null 2>&1 || print_warning "Nao foi possivel abrir o navegador automaticamente."
    else
        print_warning "Comando 'open' indisponivel. Abra manualmente ${FRONTEND_URL}."
    fi
}

docker_build() {
    check_docker
    print_status "Construindo os servicos definidos no Docker Compose..."

    if run_compose build; then
        print_success "Build concluido com sucesso."
    else
        print_error "Falha ao construir os servicos."
        exit 1
    fi
}

docker_up() {
    check_docker
    print_status "Subindo frontend e backend com Docker Compose..."

    if run_compose up -d --build; then
        print_success "Servicos iniciados com sucesso."
        print_status "Frontend: ${FRONTEND_URL}"
        print_status "API: ${API_URL}"
        print_status "Documentacao: ${API_URL}/docs"
        open_frontend
    else
        print_error "Falha ao subir os servicos."
        exit 1
    fi
}

docker_down() {
    check_docker
    print_status "Derrubando os servicos do Docker Compose..."

    if run_compose down; then
        print_success "Servicos encerrados com sucesso."
    else
        print_error "Falha ao derrubar os servicos."
        exit 1
    fi
}

docker_restart() {
    check_docker
    print_status "Reiniciando os servicos..."
    docker_down
    docker_up
}

docker_logs() {
    check_docker
    local service="${1:-}"

    if [ -n "${service}" ]; then
        print_status "Exibindo logs do servico '${service}'..."
        run_compose logs -f "${service}"
    else
        print_status "Exibindo logs de todos os servicos..."
        run_compose logs -f
    fi
}

docker_ps() {
    check_docker
    print_status "Status atual dos servicos:"
    run_compose ps
}

show_help() {
    echo "Verbalaize Docker Scripts"
    echo ""
    echo "Usage: ./scripts.sh [command] [service]"
    echo ""
    echo "Commands:"
    echo "  docker-build        Build dos servicos do Docker Compose"
    echo "  docker-up           Sobe frontend e backend com build"
    echo "  docker-down         Derruba os servicos"
    echo "  docker-restart      Reinicia os servicos"
    echo "  docker-logs         Exibe logs de todos os servicos"
    echo "  docker-logs <name>  Exibe logs de um servico especifico"
    echo "  docker-ps           Mostra status dos servicos"
    echo "  help                Exibe esta ajuda"
}

command="${1:-help}"
service="${2:-}"

case "${command}" in
    docker-build)
        docker_build
        ;;
    docker-up)
        docker_up
        ;;
    docker-down)
        docker_down
        ;;
    docker-restart)
        docker_restart
        ;;
    docker-logs)
        docker_logs "${service}"
        ;;
    docker-ps)
        docker_ps
        ;;
    help|*)
        show_help
        ;;
esac
