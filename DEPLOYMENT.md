# OptiFork Deployment Guide 🚀

This guide covers different deployment strategies for OptiFork, from development to production environments.

## 🚀 Quick Start (SQLite)

The fastest way to get OptiFork running:

```bash
# Clone the repository
git clone <your-repo-url>
cd optifork

# Start with Docker Compose (uses SQLite by default)
docker-compose up -d

# Access the application
open http://localhost:3000
```

That's it! OptiFork is now running with:
- **Frontend**: http://localhost:3000 or http://localhost:80
- **Backend API**: http://localhost:8000
- **Database**: SQLite (persistent volume)

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum
- 1GB disk space

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │ -> │   (FastAPI)     │ -> │   (SQLite/PG)   │
│   Port: 80      │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
│                                                                 │
└─────────────────── Docker Network ───────────────────────────┘
```

## 🔧 Configuration Options

### Option 1: SQLite (Default - Recommended for Testing)

```bash
# Uses the default docker-compose.yml
docker-compose up -d
```

**Pros**: Zero configuration, fast startup
**Cons**: Single node only, not ideal for high traffic

### Option 2: PostgreSQL (Recommended for Production)

```bash
# Edit docker-compose.yml and uncomment PostgreSQL sections:
# 1. Uncomment postgres service dependency in backend
# 2. Change DATABASE_URL to postgresql connection
# 3. Start services

docker-compose up -d
```

**Pros**: Scalable, production-ready, better performance
**Cons**: Slightly more complex setup

### Option 3: Custom Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
vim .env

# Start with custom environment
docker-compose --env-file .env up -d
```

## 🛠️ Deployment Commands

### Development Deployment
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart specific service
docker-compose restart backend
```

### Production Deployment
```bash
# Pull latest images
docker-compose pull

# Start in production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale backend (if needed)
docker-compose up -d --scale backend=3
```

### Maintenance Commands
```bash
# Update containers
docker-compose pull && docker-compose up -d

# Backup database (SQLite)
docker cp optifork-backend:/app/data/optifork.db ./backup-$(date +%Y%m%d).db

# Backup database (PostgreSQL)
docker exec optifork-postgres pg_dump -U optifork optifork > backup-$(date +%Y%m%d).sql

# View container status
docker-compose ps

# Remove everything (including volumes)
docker-compose down -v --remove-orphans
```

## 📊 Monitoring & Health Checks

All services include built-in health checks:

```bash
# Check service health
docker-compose ps

# View detailed health status
docker inspect optifork-backend --format='{{.State.Health.Status}}'

# Monitor logs in real-time
docker-compose logs -f backend frontend
```

Health check endpoints:
- **Backend**: http://localhost:8000/flags
- **Frontend**: http://localhost:3000/
- **PostgreSQL**: Built-in `pg_isready`

## 🔒 Security Configuration

### Environment Variables
```bash
# Generate secure secrets
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

# Set in .env file
echo "SECRET_KEY=$SECRET_KEY" >> .env
echo "JWT_SECRET=$JWT_SECRET" >> .env
```

### Network Security
```bash
# Restrict external access (production)
# Edit docker-compose.yml to remove port mappings
# Use reverse proxy (nginx, traefik) instead
```

### Database Security
```bash
# Change default PostgreSQL password
POSTGRES_PASSWORD=$(openssl rand -base64 32)
```

## 🔄 Backup & Recovery

### Automated Backups
```bash
# Create backup script
cat << 'EOF' > backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec optifork-postgres pg_dump -U optifork optifork > "backup_$DATE.sql"
# Keep only last 7 days
find . -name "backup_*.sql" -mtime +7 -delete
EOF

chmod +x backup.sh

# Add to crontab for daily backups
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

### Recovery
```bash
# Restore from backup (PostgreSQL)
docker exec -i optifork-postgres psql -U optifork optifork < backup_20231201.sql

# Restore from backup (SQLite)
docker cp backup-20231201.db optifork-backend:/app/data/optifork.db
docker-compose restart backend
```

## 🚀 Scaling & Performance

### Horizontal Scaling
```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Add load balancer (nginx)
# See docker-compose.prod.yml for example
```

### Performance Tuning
```bash
# Enable Redis caching
# Uncomment redis service in docker-compose.yml

# Optimize database
# For PostgreSQL: adjust shared_buffers, work_mem
# For SQLite: enable WAL mode
```

## 🐛 Troubleshooting

### Common Issues & Solutions

1. **Port Already in Use**
   ```bash
   # Find and kill process using port
   lsof -ti:8000 | xargs kill -9
   ```

2. **Database Connection Failed**
   ```bash
   # Check database health
   docker-compose logs postgres
   
   # Reset database
   docker-compose down -v
   docker-compose up -d
   ```

3. **Frontend Can't Connect to Backend**
   ```bash
   # Check network connectivity
   docker exec optifork-frontend ping backend
   
   # Verify API is responding
   curl http://localhost:8000/flags
   ```

4. **Backend ModuleNotFoundError**
   ```bash
   # This was fixed in v2.0 - rebuild if you encounter it
   docker-compose down
   docker-compose up --build
   ```
   **Root cause**: Import paths were using `backend.` prefix which doesn't work in Docker containers.
   **Fix**: Changed to relative imports in all Python files.

5. **Nginx Configuration Error (Frontend)**
   ```bash
   nginx: [emerg] invalid value "must-revalidate" in nginx.conf
   ```
   **Solution**: This was fixed in v2.0. If you encounter it:
   ```bash
   docker-compose up --build frontend
   ```
   **Root cause**: Invalid `gzip_proxied` directive value.
   **Fix**: Removed invalid `must-revalidate` value from nginx config.

6. **Missing requirements.txt in Backend**
   ```bash
   ERROR: failed to calculate checksum of ref: "/requirements.txt": not found
   ```
   **Solution**: Fixed in v2.0 - `requirements.txt` is now included.
   **Dependencies**: FastAPI, Uvicorn, SQLAlchemy, Pydantic, etc.

7. **TypeScript Build Errors in Frontend**
   ```bash
   error TS6133: 'React' is declared but its value is never read
   ```
   **Solution**: Fixed in v2.0 - removed unused React imports.
   **Build process**: Now uses full npm ci instead of production-only install.

8. **Permission Issues**
   ```bash
   # Fix volume permissions
   sudo chown -R 1000:1000 backend_data/
   ```

### Logs & Debugging
```bash
# View all logs
docker-compose logs

# Follow specific service logs
docker-compose logs -f backend

# Debug container
docker exec -it optifork-backend bash

# Check container resources
docker stats
```

## 📈 Production Checklist

- [ ] Change default passwords
- [ ] Use PostgreSQL instead of SQLite
- [ ] Enable SSL/HTTPS
- [ ] Set up automated backups
- [ ] Configure monitoring
- [ ] Set resource limits
- [ ] Use secrets management
- [ ] Enable log rotation
- [ ] Test disaster recovery

## 🤝 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/optifork/issues)
- **Documentation**: [Wiki](https://github.com/your-repo/optifork/wiki)
- **Community**: [Discussions](https://github.com/your-repo/optifork/discussions)

---

Made with ❤️ by the OptiFork team