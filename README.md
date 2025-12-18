# OptiFork 🚀
**Open Source Feature Flag and A/B Testing Platform**
OptiFork is a production-ready, self-hosted feature flag and A/B testing platform designed for modern applications. Built with FastAPI and React, it provides enterprise-grade capabilities with the flexibility of open source.

![GitHub Repo stars](https://img.shields.io/github/stars/anshumat-org-opensource/optifork?style=social)
![GitHub forks](https://img.shields.io/github/forks/anshumat-org-opensource/optifork?style=social)
![Contributors](https://img.shields.io/github/contributors/anshumat-org-opensource/optifork)
![GitHub last commit](https://img.shields.io/github/last-commit/anshumat-org-opensource/optifork)
![GitHub issues](https://img.shields.io/github/issues/anshumat-org-opensource/optifork)
![GitHub pull requests](https://img.shields.io/github/issues-pr/anshumat-org-opensource/optifork)

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](https://github.com/anshumat-org-opensource/optifork/pulls)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![License: OSI Approved](https://img.shields.io/badge/license-OSI--Approved-green.svg)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.68+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

![Open Source Love](https://badges.frapsoft.com/os/v3/open-source.svg?v=103)

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

### Remote Configs Integration

Remote configs allow dynamic application control without code deployments.

#### Creating Remote Configs
```bash
# Theme Configuration
curl -X POST http://localhost:8000/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "app_theme",
    "description": "Application theme settings",
    "config_data": {
      "primary_color": "#007bff",
      "dark_mode_enabled": true,
      "sidebar_collapsed": false
    },
    "environment": "production",
    "is_active": true
  }'

# Feature Flags Config
curl -X POST http://localhost:8000/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "feature_flags",
    "description": "Feature toggle configuration", 
    "config_data": {
      "enable_new_dashboard": true,
      "enable_payment_v2": false,
      "max_upload_size": 10485760
    },
    "environment": "production"
  }'
```

#### JavaScript/React Integration
```javascript
class ConfigManager {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.configs = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  async fetchConfigs() {
    const response = await fetch(`${this.baseUrl}/configs`);
    const configs = await response.json();
    
    configs.forEach(config => {
      this.configs.set(config.name, {
        ...config,
        cached_at: Date.now()
      });
    });
    return configs;
  }

  async getConfig(name, defaultValue = null) {
    const cached = this.configs.get(name);
    
    // Check cache validity
    if (cached && (Date.now() - cached.cached_at) < this.cacheTTL) {
      return cached.config_data;
    }
    
    await this.fetchConfigs();
    const config = this.configs.get(name);
    return config ? config.config_data : defaultValue;
  }

  async isFeatureEnabled(featureName) {
    const featureFlags = await this.getConfig('feature_flags', {});
    return featureFlags[featureName] || false;
  }
}

// Usage
const configManager = new ConfigManager();

// Feature flag usage
if (await configManager.isFeatureEnabled('enable_new_dashboard')) {
  renderNewDashboard();
} else {
  renderLegacyDashboard();
}

// Theme application
const themeConfig = await configManager.getConfig('app_theme');
if (themeConfig?.dark_mode_enabled) {
  document.body.classList.add('dark-theme');
}
```

#### React Hook for Remote Configs
```javascript
import { useState, useEffect } from 'react';

export function useRemoteConfig(configName, defaultValue = null) {
  const [config, setConfig] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('http://localhost:8000/configs');
        const configs = await response.json();
        
        const targetConfig = configs.find(c => c.name === configName);
        setConfig(targetConfig ? targetConfig.config_data : defaultValue);
      } catch (error) {
        console.error('Config fetch failed:', error);
        setConfig(defaultValue);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [configName, defaultValue]);

  return { config, loading };
}

// Component usage
function Dashboard() {
  const { config: themeConfig } = useRemoteConfig('app_theme');
  const { config: features } = useRemoteConfig('feature_flags');

  return (
    <div style={{ color: themeConfig?.primary_color }}>
      {features?.enable_new_dashboard ? (
        <NewDashboard />
      ) : (
        <LegacyDashboard />
      )}
    </div>
  );
}
```

### User Segments Integration

User segments enable targeted feature rollouts and A/B testing.

#### Creating User Segments
```bash
# Geographic Segment
curl -X POST http://localhost:8000/segments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "us_users",
    "description": "Users located in United States",
    "criteria": {
      "country": "US",
      "timezone": ["EST", "CST", "MST", "PST"]
    },
    "is_active": true
  }'

# Premium Users Segment
curl -X POST http://localhost:8000/segments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "premium_users", 
    "description": "Premium subscription users",
    "criteria": {
      "subscription_tier": "premium",
      "account_age_days": 30
    },
    "is_active": true
  }'
```

#### JavaScript User Segment Manager
```javascript
class UserSegmentManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.userContext = {};
    this.segments = [];
  }

  setUserContext(context) {
    this.userContext = { ...context };
    this.evaluateSegments();
  }

  async fetchSegments() {
    const response = await fetch(`${this.configManager.baseUrl}/segments`);
    this.segments = await response.json();
    this.evaluateSegments();
  }

  evaluateSegments() {
    return this.segments.filter(segment => {
      return this.matchesCriteria(this.userContext, segment.criteria);
    });
  }

  matchesCriteria(userContext, criteria) {
    return Object.entries(criteria).every(([key, value]) => {
      const userValue = userContext[key];
      
      if (Array.isArray(value)) {
        return value.includes(userValue);
      }
      
      if (typeof value === 'number') {
        return userValue >= value;
      }
      
      return userValue === value;
    });
  }

  async getSegmentedConfig(configName, defaultValue = null) {
    const userSegments = this.evaluateSegments();
    
    // Try segment-specific configs first
    for (const segment of userSegments) {
      const segmentConfigName = `${configName}_${segment.name}`;
      const segmentConfig = await this.configManager.getConfig(segmentConfigName);
      if (segmentConfig) {
        return segmentConfig;
      }
    }
    
    // Fallback to general config
    return await this.configManager.getConfig(configName, defaultValue);
  }
}

// Usage
const configManager = new ConfigManager();
const segmentManager = new UserSegmentManager(configManager);

// Set user context
segmentManager.setUserContext({
  country: 'US',
  subscription_tier: 'premium',
  account_age_days: 45
});

// Get segmented configuration
const features = await segmentManager.getSegmentedConfig('feature_flags');
const premiumTheme = await segmentManager.getSegmentedConfig('app_theme');
```

### Feature Flags Integration

#### JavaScript/React
```javascript
const isEnabled = await checkFeatureFlag(
  'new_checkout', 
  'user123',
  { country: 'US', plan: 'premium' }
);
```

#### Python
```python
import httpx

class OptiForkClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.client = httpx.AsyncClient()
    
    async def get_config(self, config_name):
        response = await self.client.get(f"{self.base_url}/configs")
        configs = response.json()
        
        for config in configs:
            if config["name"] == config_name:
                return config["config_data"]
        return None
    
    async def check_flag(self, flag_name, user_id, context=None):
        params = {"user_id": user_id}
        if context:
            params.update(context)
        
        response = await self.client.get(
            f"{self.base_url}/flags/{flag_name}", 
            params=params
        )
        return response.json()

# Usage
client = OptiForkClient('http://localhost:8000')
enabled = await client.check_flag('new_feature', 'user123')
config = await client.get_config('app_theme')
```

#### cURL Examples
```bash
# Check feature flag
curl "http://localhost:8000/flags/new_feature?user_id=user123&country=US"

# Get all configs
curl "http://localhost:8000/configs"

# Get specific config
curl "http://localhost:8000/configs/1"

# Get all segments  
curl "http://localhost:8000/segments"

# Create feature flag with segments
curl -X POST http://localhost:8000/flags \
  -H "Content-Type: application/json" \
  -d '{
    "name": "beta_feature",
    "description": "New beta feature for premium users",
    "is_enabled": true,
    "rollout_percentage": 50,
    "targeting_rules": {
      "segments": ["premium_users", "beta_testers"]
    }
  }'
```

### Best Practices

#### 1. Configuration Caching
```javascript
// Cache configs with TTL to reduce API calls
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const configCache = new Map();

function getCachedConfig(name) {
  const cached = configCache.get(name);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  return null;
}
```

#### 2. Error Handling & Fallbacks
```javascript
async function safeGetConfig(name, defaultValue) {
  try {
    const config = await getConfig(name);
    return config || defaultValue;
  } catch (error) {
    console.error(`Config ${name} fetch failed:`, error);
    return defaultValue;
  }
}
```

#### 3. Real-time Updates
```javascript
// WebSocket connection for real-time config updates
const ws = new WebSocket('ws://localhost:8000/ws/configs');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  if (update.type === 'config_updated') {
    configCache.delete(update.config_name);
    // Refresh UI if needed
  }
};
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

We 💚 our contributors!  [![Contributors](https://img.shields.io/github/contributors/anshumat-org-opensource/optifork.svg)](https://github.com/anshumat-org-opensource/optifork/graphs/contributors)

A big thank you to everyone who has helped make **OptiFork** better — from code and design to docs, ideas, and testing.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 🏅 Contribution Stats

![GitHub contributors](https://img.shields.io/github/contributors/anshumat-org-opensource/optifork?color=brightgreen&label=Contributors)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/anshumat-org-opensource/optifork?label=Commits%20per%20month)
![GitHub last commit](https://img.shields.io/github/last-commit/anshumat-org-opensource/optifork?label=Last%20Commit)
![GitHub pull requests](https://img.shields.io/github/issues-pr-closed/anshumat-org-opensource/optifork?label=PRs%20Merged)
![GitHub issues](https://img.shields.io/github/issues-closed/anshumat-org-opensource/optifork?label=Issues%20Closed)
![GitHub forks](https://img.shields.io/github/forks/anshumat-org-opensource/optifork?style=social)
![GitHub stars](https://img.shields.io/github/stars/anshumat-org-opensource/optifork?style=social)

### 💬 Community Links

- 💻 [Contribute on GitHub](https://github.com/anshumat-org-opensource/optifork/pulls)
- 🪲 [Report Issues](https://github.com/anshumat-org-opensource/optifork/issues)
- 🌐 [View All Contributors](https://github.com/anshumat-org-opensource/optifork/graphs/contributors)
- 📖 [Read Contributing Guide](#🤝-contributing)

## License
OptiFork was originally released under the MIT License.  
As of **November 2025**, the project has been relicensed under the  
**Apache License, Version 2.0**, maintained by the **Anshumat Foundation**,  
a registered nonprofit organization in India.

This change provides stronger patent protection and enterprise compatibility  
while keeping OptiFork fully open source and free to use.

See the [LICENSE](./LICENSE) file for the full text.

[![Open Source Initiative](https://i0.wp.com/opensource.org/wp-content/uploads/2023/03/cropped-OSI-horizontal-large.png?fit=640%2C229&quality=80&ssl=1)](https://opensource.org/)

[![OSI Approved License](https://img.shields.io/badge/License-OSI--Approved-brightgreen.svg)](https://opensource.org/licenses)
[![OSI Approved](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub Sponsors](https://img.shields.io/badge/Support-Open%20Source-orange.svg)](https://github.com/sponsors/anshumat-org-opensource)

[![Nonprofit Maintainer](https://img.shields.io/badge/Maintained_by-Anshumat_Foundation-green.svg)](#)




## 👨‍💻 Author

Built with ❤️ by [Anupam Singh](https://github.com/anupamprataps)

---

⭐ **Star this repo** if you find OptiFork helpful!
