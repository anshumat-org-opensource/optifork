#!/bin/bash

# OptiFork Podman Stop Script
set -e

echo "🛑 Stopping OptiFork services..."

# Stop all services
podman-compose -f docker-compose.yml down

echo "🧹 Cleaning up containers..."
podman container prune -f

echo "✅ All services stopped!"