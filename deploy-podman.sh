#!/bin/bash

# OptiFork Podman Deployment Script
set -e

echo "🚀 Starting OptiFork deployment with Podman..."

# Check if podman-compose is installed
if ! command -v podman-compose &> /dev/null; then
    echo "❌ podman-compose is not installed. Installing..."
    pip3 install podman-compose
fi

# Stop and remove existing containers
echo "🧹 Cleaning up existing containers..."
podman-compose -f docker-compose.yml down --volumes 2>/dev/null || true

# Build and start services
echo "🏗️  Building and starting services..."
podman-compose -f docker-compose.yml up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "📊 Checking service status..."
podman-compose -f docker-compose.yml ps

# Test endpoints
echo "🔍 Testing endpoints..."
echo "Backend health check:"
curl -f http://localhost:8000/health || echo "Backend not ready yet"

echo "Frontend check:"
curl -f http://localhost:80/ || echo "Frontend not ready yet"

echo "✅ Deployment complete!"
echo "🌐 Frontend: http://localhost"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 Backend Health: http://localhost:8000/health"