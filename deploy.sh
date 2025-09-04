#!/bin/bash

# OptiFork Deployment Script
# Usage: ./deploy.sh [dev|prod|stop|status|logs|backup]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_PROJECT_NAME="optifork"
BACKUP_DIR="./backups"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running. Please start Docker first."
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        error "docker-compose is not installed. Please install Docker Compose."
    fi
}

# Create backup directory
ensure_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log "Created backup directory: $BACKUP_DIR"
    fi
}

# Development deployment
deploy_dev() {
    log "Starting OptiFork in development mode..."
    
    # Copy environment template if .env doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            warn "Created .env from template. Please review and customize if needed."
        fi
    fi
    
    # Build and start services
    docker-compose -p $COMPOSE_PROJECT_NAME build --no-cache
    docker-compose -p $COMPOSE_PROJECT_NAME up -d
    
    # Wait for services to be healthy
    log "Waiting for services to start..."
    sleep 10
    
    # Check health
    check_health
    
    log "✅ OptiFork is running!"
    echo ""
    info "🌐 Frontend: http://localhost:3000 or http://localhost:80"
    info "🚀 Backend API: http://localhost:8000"
    info "📊 API Docs: http://localhost:8000/docs"
    echo ""
    info "Run './deploy.sh logs' to view logs"
    info "Run './deploy.sh status' to check service status"
}

# Production deployment
deploy_prod() {
    log "Starting OptiFork in production mode..."
    
    if [ ! -f .env ]; then
        error "Production deployment requires .env file. Copy from .env.example and configure."
    fi
    
    # Create production docker-compose override if it doesn't exist
    if [ ! -f docker-compose.prod.yml ]; then
        warn "docker-compose.prod.yml not found. Using default configuration."
    fi
    
    # Pull latest images
    docker-compose -p $COMPOSE_PROJECT_NAME pull
    
    # Start services
    if [ -f docker-compose.prod.yml ]; then
        docker-compose -p $COMPOSE_PROJECT_NAME -f docker-compose.yml -f docker-compose.prod.yml up -d
    else
        docker-compose -p $COMPOSE_PROJECT_NAME up -d
    fi
    
    # Wait and check health
    log "Waiting for services to start..."
    sleep 15
    check_health
    
    log "✅ OptiFork production deployment complete!"
}

# Stop services
stop_services() {
    log "Stopping OptiFork services..."
    docker-compose -p $COMPOSE_PROJECT_NAME down
    log "✅ Services stopped"
}

# Check service health
check_health() {
    log "Checking service health..."
    
    # Check backend health
    for i in {1..30}; do
        if curl -sf http://localhost:8000/flags >/dev/null 2>&1; then
            log "✅ Backend is healthy"
            break
        elif [ $i -eq 30 ]; then
            error "❌ Backend health check failed after 30 attempts"
        else
            sleep 2
        fi
    done
    
    # Check frontend health  
    for i in {1..30}; do
        if curl -sf http://localhost:80/ >/dev/null 2>&1; then
            log "✅ Frontend is healthy"
            break
        elif [ $i -eq 30 ]; then
            error "❌ Frontend health check failed after 30 attempts"
        else
            sleep 2
        fi
    done
}

# Show service status
show_status() {
    info "OptiFork Service Status:"
    docker-compose -p $COMPOSE_PROJECT_NAME ps
    
    echo ""
    info "Container Health:"
    docker inspect optifork-backend --format='Backend: {{.State.Health.Status}}' 2>/dev/null || echo "Backend: container not found"
    docker inspect optifork-frontend --format='Frontend: {{.State.Health.Status}}' 2>/dev/null || echo "Frontend: container not found" 
    docker inspect optifork-postgres --format='Database: {{.State.Health.Status}}' 2>/dev/null || echo "Database: not using PostgreSQL or container not found"
}

# Show logs
show_logs() {
    local service=${1:-}
    if [ -n "$service" ]; then
        docker-compose -p $COMPOSE_PROJECT_NAME logs -f "$service"
    else
        docker-compose -p $COMPOSE_PROJECT_NAME logs -f
    fi
}

# Create backup
create_backup() {
    ensure_backup_dir
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    log "Creating backup..."
    
    # Backup SQLite database if it exists
    if docker exec optifork-backend test -f /app/data/optifork.db 2>/dev/null; then
        docker cp optifork-backend:/app/data/optifork.db "$BACKUP_DIR/optifork_$timestamp.db"
        log "✅ SQLite database backed up to: $BACKUP_DIR/optifork_$timestamp.db"
    fi
    
    # Backup PostgreSQL if it exists
    if docker exec optifork-postgres pg_isready -U optifork >/dev/null 2>&1; then
        docker exec optifork-postgres pg_dump -U optifork optifork > "$BACKUP_DIR/optifork_$timestamp.sql"
        log "✅ PostgreSQL database backed up to: $BACKUP_DIR/optifork_$timestamp.sql"
    fi
    
    # Clean up old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "optifork_*.db" -mtime +7 -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "optifork_*.sql" -mtime +7 -delete 2>/dev/null || true
    
    log "✅ Backup complete"
}

# Update deployment
update() {
    log "Updating OptiFork..."
    
    # Create backup before update
    create_backup
    
    # Pull latest changes (if in git repo)
    if [ -d .git ]; then
        git pull
    fi
    
    # Rebuild and restart services
    docker-compose -p $COMPOSE_PROJECT_NAME build --no-cache
    docker-compose -p $COMPOSE_PROJECT_NAME up -d
    
    # Check health
    check_health
    
    log "✅ Update complete"
}

# Show help
show_help() {
    echo "OptiFork Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev       Start in development mode (default)"
    echo "  prod      Start in production mode"
    echo "  stop      Stop all services"
    echo "  status    Show service status"
    echo "  logs      Show logs for all services"
    echo "  logs <service>  Show logs for specific service"
    echo "  backup    Create database backup"
    echo "  update    Update and restart services"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev              # Start development environment"
    echo "  $0 prod             # Start production environment"  
    echo "  $0 logs backend     # Show backend logs"
    echo "  $0 backup           # Create backup"
}

# Main script logic
main() {
    local command=${1:-dev}
    
    check_docker
    
    case "$command" in
        "dev"|"development")
            deploy_dev
            ;;
        "prod"|"production")
            deploy_prod
            ;;
        "stop")
            stop_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$2"
            ;;
        "backup")
            create_backup
            ;;
        "update")
            update
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            error "Unknown command: $command. Run '$0 help' for usage information."
            ;;
    esac
}

# Run main function with all arguments
main "$@"