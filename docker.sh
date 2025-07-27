#!/bin/bash

# Verbalaize Docker Management Script

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show help
show_help() {
    echo "Verbalaize Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  up, start     - Start all services"
    echo "  down, stop    - Stop all services"
    echo "  restart       - Restart all services"
    echo "  build         - Build all images"
    echo "  rebuild       - Rebuild all images without cache"
    echo "  logs          - Show logs for all services"
    echo "  logs-backend  - Show backend logs only"
    echo "  logs-frontend - Show frontend logs only"
    echo "  status        - Show service status"
    echo "  clean         - Remove all containers, networks, and volumes"
    echo "  help          - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 up         # Start the application"
    echo "  $0 logs       # View logs"
    echo "  $0 rebuild    # Rebuild and restart"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Function to start services
start_services() {
    print_status "Starting Verbalaize services..."
    docker-compose up -d
    print_status "Services started successfully!"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend API: http://localhost:8000"
    print_status "Backend Health: http://localhost:8000/health"
    print_status "API Docs: http://localhost:8000/docs"
}

# Function to stop services
stop_services() {
    print_status "Stopping Verbalaize services..."
    docker-compose down
    print_status "Services stopped successfully!"
}

# Function to restart services
restart_services() {
    print_status "Restarting Verbalaize services..."
    docker-compose restart
    print_status "Services restarted successfully!"
}

# Function to build images
build_images() {
    print_status "Building Verbalaize images..."
    docker-compose build
    print_status "Images built successfully!"
}

# Function to rebuild images
rebuild_images() {
    print_status "Rebuilding Verbalaize images (no cache)..."
    docker-compose build --no-cache
    print_status "Images rebuilt successfully!"
}

# Function to show logs
show_logs() {
    docker-compose logs -f
}

# Function to show backend logs
show_backend_logs() {
    docker-compose logs -f backend
}

# Function to show frontend logs
show_frontend_logs() {
    docker-compose logs -f frontend
}

# Function to show status
show_status() {
    print_status "Service status:"
    docker-compose ps
}

# Function to clean everything
clean_all() {
    print_warning "This will remove all containers, networks, and volumes."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up..."
        docker-compose down -v --remove-orphans
        docker-compose rm -f
        docker system prune -f
        print_status "Cleanup completed!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Main script logic
case "${1:-help}" in
    "up"|"start")
        check_docker
        start_services
        ;;
    "down"|"stop")
        check_docker
        stop_services
        ;;
    "restart")
        check_docker
        restart_services
        ;;
    "build")
        check_docker
        build_images
        ;;
    "rebuild")
        check_docker
        rebuild_images
        ;;
    "logs")
        check_docker
        show_logs
        ;;
    "logs-backend")
        check_docker
        show_backend_logs
        ;;
    "logs-frontend")
        check_docker
        show_frontend_logs
        ;;
    "status")
        check_docker
        show_status
        ;;
    "clean")
        check_docker
        clean_all
        ;;
    "help"|*)
        show_help
        ;;
esac
