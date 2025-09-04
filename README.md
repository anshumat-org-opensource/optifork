# 🚩 OptiFork - Feature Flag & Experimentation Platform

OptiFork is a lightweight, self-hosted platform for managing **feature flags**, **targeting rules**, and **A/B experiments** with real-time exposure tracking and analytics.

## ✨ Features

- 🚩 **Feature Flags** with percentage rollouts and targeting rules
- 🧪 **A/B Testing** with variant assignment and exposure logging  
- 📊 **Real-time Analytics** and exposure tracking dashboard
- 🔌 **Multi-language SDKs** (JavaScript, Python, Java, Go)
- 🐳 **Docker Deploy** - Get running in 60 seconds
- 🎯 **Smart Targeting** - User attributes, geo, custom rules
- 📈 **Export Data** - JSON, CSV, PostgreSQL, BigQuery ready

## 🚀 Quick Start with Docker

### Prerequisites

Before starting, ensure you have:

- **Docker Desktop** installed and running
  - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
  - Ensure Docker daemon is running (`docker --version` should work)
- **Git** for cloning the repository
- **8GB+ RAM** recommended for smooth Docker operation

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/anupamprataps/optifork.git
   cd optifork
   ```
   
   > **Note**: Replace the repository URL with your actual GitHub repository URL

2. **Start the application**
   ```bash
   ./deploy.sh dev
   ```
   
   This will:
   - Build all Docker images (backend, frontend, database)
   - Start all services in development mode
   - Set up the database with required tables
   - Launch the web interface

3. **Access the application**

   **That's it!** OptiFork is now running at:
   - 🌐 **Dashboard**: http://localhost:80 or http://localhost:3000
   - 🚀 **API**: http://localhost:8000  
   - 📚 **API Docs**: http://localhost:8000/docs

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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

Built with ❤️ by [Anupam Singh](https://github.com/anupamprataps)

---

⭐ **Star this repo** if you find OptiFork helpful!
