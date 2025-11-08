# OptiFork 🚀

**Open Source Feature Flag and A/B Testing Platform**

OptiFork is a production-ready, self-hosted feature flag and A/B testing platform designed for modern applications. Built with FastAPI and React, it provides enterprise-grade capabilities with the flexibility of open source.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.68+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

## ✨ Features

### Core Features
- 🎯 **Feature Flags**: Boolean flags with percentage rollouts and rule-based targeting
- 🧪 **A/B Testing**: Multi-variant experiments with statistical analysis
- 👥 **User Targeting**: Advanced rule-based user segmentation
- 📊 **Real-time Analytics**: Flag exposure tracking and experiment metrics
- 🔌 **Snowflake Integration**: Direct data warehouse connectivity

### Production Ready
- 🗄️ **PostgreSQL Support**: Production database with connection pooling
- ⚡ **Redis Caching**: High-performance caching layer
- 🛡️ **Security Middleware**: Rate limiting, CORS, security headers
- 📈 **Monitoring**: Health checks, Prometheus metrics, system stats
- 💾 **Backup & Restore**: Automated backups with compression
- 🐳 **Docker Support**: Production-ready containerization

### Developer Experience
- 🚀 **Fast Setup**: One-command Docker deployment
- 📚 **API Documentation**: Auto-generated OpenAPI/Swagger docs
- 🔧 **Configuration**: Environment-based config management
- 📝 **Logging**: Structured logging with configurable levels

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/optifork.git
   cd optifork
   ```

2. **Start with Docker Compose**
   ```bash
   # Development (SQLite)
   docker-compose up -d
   
   # Production (PostgreSQL + Redis)
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Manual Setup

#### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL (optional, defaults to SQLite)
- Redis (optional, for caching)

#### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Configure environment (optional)
cp ../.env.example .env
# Edit .env with your settings

# Initialize database
python -c "from db import init_database; import asyncio; asyncio.run(init_database())"

# Start backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### ✅ Verify Installation

After starting the services, verify everything is working:

```bash
# Check all containers are running
docker ps

# Expected output should show 3 running containers:
# optifork-frontend, optifork-backend, optifork-redis

# Test API endpoint
curl http://localhost:8000/flags

# Should return: []

# Open frontend in browser
open http://localhost:80
```

If any step fails, check the [Troubleshooting](#️-troubleshooting) section below.

### Alternative: Manual Docker Setup

If the deploy script doesn't work, you can run Docker manually:

```bash
# Start all services
docker-compose up --build -d

# Check service status
docker ps

# View logs
docker-compose logs

# Stop services
docker-compose down
```

## 📦 Installation Options

### Option 1: Docker (Recommended)

```bash
# Quick start (SQLite)
./deploy.sh dev

# Production (PostgreSQL + Redis)  
./deploy.sh prod
```

### Option 2: Manual Setup

#### Backend Setup

1. **Navigate to backend**
   ```bash
   cd backend
   ```

2. **Set up virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server**

   ```bash
   uvicorn main:app --reload
   ```

   The API will be live at: `http://localhost:8000`

---

## 🎨 Frontend Setup

1. **Navigate to frontend**

   ```bash
   cd frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run frontend**

   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

---

## 🔌 API Overview

| Endpoint                                             | Method | Description                |
| ---------------------------------------------------- | ------ | -------------------------- |
| `/experiments`                                       | `POST` | Create a new experiment    |
| `/experiments`                                       | `GET`  | List all experiments       |
| `/experiments/{experiment_name}/assign?user_id={id}` | `GET`  | Assign a user to a variant |
| `/experiments/{experiment_name}/exposure`            | `POST` | Log exposure for user      |
| `/experiments/results`                               | `GET`  | View experiment results    |

---

## 🧪 Sample Experiment JSON

```json
{
  "name": "pricing_test",
  "description": "A/B test on new pricing model",
  "flag_id": 1,
  "variants": [
    { "name": "control", "traffic_split": 0.5 },
    { "name": "variant_a", "traffic_split": 0.5 }
  ]
}


## 🐳 Docker Deployment

### Quick Commands

```bash
# Start development environment
./deploy.sh dev

# Start production environment
./deploy.sh prod

# View service status
./deploy.sh status

# View logs
./deploy.sh logs

# Create backup
./deploy.sh backup

# Stop all services
./deploy.sh stop
```

### Configuration

Copy and customize environment:
```bash
cp .env.example .env
vim .env
```

### Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │ -> │   (FastAPI)     │ -> │   (SQLite/PG)   │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Production Features

- 🔒 **PostgreSQL** for production database
- 🚀 **Redis** for caching and sessions  
- 📊 **Health checks** and monitoring
- 🔄 **Automated backups**
- 📈 **Horizontal scaling** ready
- 🛡️ **Security** hardened containers

For detailed deployment guide, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🔌 Integration Examples

### JavaScript/React
```javascript
const isEnabled = await checkFeatureFlag(
  'new_checkout', 
  'user123',
  { country: 'US', plan: 'premium' }
);
```

### Python
```python
client = OptiForkClient('http://localhost:8000')
enabled = client.check_flag('new_feature', 'user123')
```

### cURL
```bash
curl "http://localhost:8000/flags/new_feature?user_id=user123&country=US"
```

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/flags` | `POST` | Create feature flag |
| `/flags` | `GET` | List all flags |
| `/flags/{name}` | `GET` | Check flag for user |
| `/flags/{name}` | `PUT` | Update flag |
| `/flags/{name}/exposures` | `GET` | Get flag exposures |
| `/experiments` | `POST` | Create experiment |
| `/experiments/{name}/assign` | `GET` | Assign user to variant |

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### 🐳 Docker Issues

**Problem**: `Docker is not running`
```bash
ERROR: Docker is not running. Please start Docker first.
```
**Solution**: 
- Start Docker Desktop application
- Wait for Docker to fully start (green whale icon)
- Run `docker --version` to verify

**Problem**: `Port already in use`
```bash
listen tcp 0.0.0.0:8000: bind: address already in use
```
**Solution**:
```bash
# Find process using the port
lsof -i :8000
# Kill the process or use different port
kill -9 <PID>
# Or stop other services
docker-compose down
```

**Problem**: `Backend container keeps restarting`
```bash
Container optifork-backend  Restarting (1) 18 seconds ago
```
**Solution**:
```bash
# Check backend logs for errors
docker logs optifork-backend

# Common fixes:
# 1. Module import errors - rebuilding usually fixes this
docker-compose down
docker-compose up --build

# 2. Database connection issues
docker-compose restart postgres
```

**Problem**: `Frontend shows nginx errors`
```bash
nginx: [emerg] invalid value in nginx.conf
```
**Solution**: This should be auto-fixed in the latest version. If not:
```bash
# Rebuild frontend
docker-compose up --build frontend
```

#### 🌐 Access Issues

**Problem**: `Cannot access http://localhost:80`
**Solution**:
```bash
# Check if containers are running
docker ps

# Check container logs
docker logs optifork-frontend
docker logs optifork-backend

# Try alternative port
open http://localhost:3000
```

**Problem**: `API returns 404 or connection refused`
**Solution**:
```bash
# Verify backend is running
curl http://localhost:8000/flags

# Check backend health
docker exec optifork-backend curl http://localhost:8000/flags
```

#### 💾 Database Issues

**Problem**: Database tables not created
**Solution**:
```bash
# Restart backend (it creates tables on startup)
docker restart optifork-backend

# Check logs to verify table creation
docker logs optifork-backend | grep "CREATE TABLE"
```

### 🔧 Development Setup

If you want to develop OptiFork:

```bash
# Clone and setup
git clone https://github.com/anupamprataps/optifork.git
cd optifork

# Backend development
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend development (in new terminal)
cd frontend
npm install
npm run dev
```

### 📞 Getting Help

If you encounter issues not covered here:

1. **Check logs**: `docker-compose logs` or `docker logs <container-name>`
2. **Search issues**: Look for similar problems in [GitHub Issues](https://github.com/anupamprataps/optifork/issues)
3. **Create issue**: File a [new issue](https://github.com/anupamprataps/optifork/issues/new) with:
   - Your OS and Docker version
   - Complete error messages
   - Steps to reproduce
   - Docker logs output

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
Originally released under the MIT License.  
As of 8th Nov, 2025 , OptiFork is licensed under the **Apache License, Version 2.0**,  
maintained by the **Anshumat Foundation**, a registered nonprofit organization in India.

## 👨‍💻 Author

Built with ❤️ by [Anupam Singh](https://github.com/anupamprataps)

---

⭐ **Star this repo** if you find OptiFork helpful!
