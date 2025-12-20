# OptiFork Architecture Diagram

## System Overview

```mermaid
graph TB
    %% Frontend Layer
    subgraph "Frontend (React/TypeScript)"
        UI[User Interface]
        FlagComp[Flag Components]
        ConfigComp[Config Components]
        SegmentComp[Segment Components]
        ExpComp[Experiment Components]
        IntegrationGuide[Integration Guide]
    end
    
    %% API Gateway/Nginx
    subgraph "Web Server"
        Nginx[Nginx - Port 80/3000]
    end
    
    %% Backend Services
    subgraph "Backend API (FastAPI - Port 8000)"
        API[FastAPI Server]
        
        subgraph "Feature Modules"
            FlagAPI[Flag API]
            ConfigAPI[Config API] 
            SegmentAPI[Segment API]
            ExpAPI[Experiment API]
        end
        
        subgraph "Core Logic"
            FlagLogic[Flag Evaluation Logic]
            SegmentLogic[Segment Matching Logic]
            ExpLogic[Experiment Assignment Logic]
            ConfigLogic[Config Resolution Logic]
        end
        
        subgraph "Data Layer"
            CRUD[CRUD Operations]
            Models[Pydantic Models]
            Schemas[API Schemas]
        end
    end
    
    %% Database Layer
    subgraph "Data Storage"
        Postgres[(PostgreSQL Database)]
        Redis[(Redis Cache)]
        
        subgraph "Database Tables"
            FlagsTable[flags table]
            ConfigsTable[configs table]
            SegmentsTable[segments table]
            ExperimentsTable[experiments table]
            ExposuresTable[exposures table]
        end
    end
    
    %% External Integration
    subgraph "Client Integration"
        JSClient[JavaScript Client]
        PythonClient[Python Client]
        GoClient[Go Client]
        JavaClient[Java Client]
        CurlClient[cURL/HTTP]
    end
    
    %% Data Flow
    UI --> Nginx
    Nginx --> API
    
    API --> FlagAPI
    API --> ConfigAPI
    API --> SegmentAPI
    API --> ExpAPI
    
    FlagAPI --> FlagLogic
    ConfigAPI --> ConfigLogic
    SegmentAPI --> SegmentLogic
    ExpAPI --> ExpLogic
    
    FlagLogic --> CRUD
    ConfigLogic --> CRUD
    SegmentLogic --> CRUD
    ExpLogic --> CRUD
    
    CRUD --> Models
    Models --> Postgres
    
    %% Caching
    FlagLogic --> Redis
    ConfigLogic --> Redis
    SegmentLogic --> Redis
    
    %% External Access
    JSClient --> API
    PythonClient --> API
    GoClient --> API
    JavaClient --> API
    CurlClient --> API
    
    %% Database Relationships
    Postgres --> FlagsTable
    Postgres --> ConfigsTable
    Postgres --> SegmentsTable
    Postgres --> ExperimentsTable
    Postgres --> ExposuresTable
```

## Feature Architecture Deep Dive

### 1. Feature Flags System

```mermaid
sequenceDiagram
    participant Client
    participant API as FastAPI
    participant Logic as Flag Logic
    participant Cache as Redis
    participant DB as PostgreSQL
    
    Client->>API: GET /flags/{flag_name}?user_id=123&country=US
    API->>Logic: evaluate_flag(flag_name, user_context)
    
    Logic->>Cache: check_cache(flag_name)
    alt Cache Hit
        Cache-->>Logic: cached_flag_config
    else Cache Miss
        Logic->>DB: SELECT * FROM flags WHERE name = ?
        DB-->>Logic: flag_config
        Logic->>Cache: cache_flag(flag_config, ttl=300s)
    end
    
    Logic->>Logic: apply_targeting_rules(flag_config, user_context)
    Logic->>Logic: apply_rollout_percentage(flag_config, user_id)
    Logic-->>API: {enabled: true/false}
    
    API->>DB: INSERT INTO exposures (flag_name, user_id, enabled, timestamp)
    API-->>Client: {flag: "flag_name", user_id: "123", enabled: true}
```

**Location**: `/backend/crud.py:check_flag()` and `/backend/main.py:/flags/{flag_name}`

### 2. Remote Configs System

```mermaid
sequenceDiagram
    participant Client
    participant API as FastAPI
    participant Logic as Config Logic
    participant Cache as Redis
    participant DB as PostgreSQL
    
    Client->>API: GET /configs
    API->>Logic: get_all_configs()
    
    Logic->>Cache: check_configs_cache()
    alt Cache Hit
        Cache-->>Logic: cached_configs
    else Cache Miss
        Logic->>DB: SELECT * FROM configs WHERE is_active = true
        DB-->>Logic: configs_list
        Logic->>Cache: cache_configs(configs_list, ttl=300s)
    end
    
    Logic->>Logic: filter_by_environment(configs_list)
    Logic-->>API: processed_configs
    API-->>Client: [{name: "theme", config_data: {...}}, ...]
    
    Note over Client: Client caches locally for 5-15 minutes
```

**Location**: `/backend/crud.py:get_configs()` and `/backend/main.py:/configs`

### 3. User Segments System

```mermaid
sequenceDiagram
    participant Client
    participant API as FastAPI
    participant Logic as Segment Logic
    participant Cache as Redis
    participant DB as PostgreSQL
    
    Client->>API: POST /segments/evaluate<br/>{user_context: {country: "US", tier: "premium"}}
    API->>Logic: evaluate_segments(user_context)
    
    Logic->>Cache: check_segments_cache()
    alt Cache Hit
        Cache-->>Logic: cached_segments
    else Cache Miss
        Logic->>DB: SELECT * FROM segments WHERE is_active = true
        DB-->>Logic: segments_list
        Logic->>Cache: cache_segments(segments_list, ttl=600s)
    end
    
    loop For each segment
        Logic->>Logic: match_criteria(user_context, segment.criteria)
    end
    
    Logic-->>API: matching_segments[]
    API-->>Client: {segments: ["premium_users", "us_users"]}
```

**Location**: `/backend/crud.py:get_segments()` and `/backend/main.py:/segments`

### 4. A/B Testing Experiments

```mermaid
sequenceDiagram
    participant Client
    participant API as FastAPI
    participant Logic as Experiment Logic
    participant Hash as Hash Function
    participant DB as PostgreSQL
    
    Client->>API: GET /experiments/{exp_name}/assign?user_id=123
    API->>Logic: assign_variant(exp_name, user_id, user_context)
    
    Logic->>DB: SELECT * FROM experiments WHERE name = ? AND is_active = true
    DB-->>Logic: experiment_config
    
    Logic->>Logic: check_targeting_rules(user_context, experiment_config)
    alt User matches targeting
        Logic->>Hash: hash(user_id + experiment_name)
        Hash-->>Logic: hash_value
        Logic->>Logic: bucket = hash_value % 100
        Logic->>Logic: determine_variant(bucket, traffic_splits)
        Logic->>DB: INSERT INTO exposures (exp_name, user_id, variant, timestamp)
    else User doesn't match
        Logic->>Logic: variant = "control"
    end
    
    Logic-->>API: {variant: "variant_a"}
    API-->>Client: {experiment: "exp_name", user_id: "123", variant: "variant_a"}
```

**Location**: `/backend/crud.py:assign_experiment()` and `/backend/main.py:/experiments/{experiment_name}/assign`

## API Endpoints Reference

### Feature Flags APIs
```
📍 File Location: /backend/main.py (lines 100-150)

GET    /flags                     # List all flags
POST   /flags                     # Create new flag
GET    /flags/{flag_name}         # Evaluate flag for user
PUT    /flags/{flag_name}         # Update flag
DELETE /flags/{flag_name}         # Delete flag
GET    /flags/{flag_name}/exposures # Get flag exposure data
```

### Remote Configs APIs
```
📍 File Location: /backend/main.py (lines 200-250)

GET    /configs                   # List all configs
POST   /configs                   # Create new config
GET    /configs/{config_id}       # Get specific config
PUT    /configs/{config_id}       # Update config
DELETE /configs/{config_id}       # Delete config
```

### User Segments APIs
```
📍 File Location: /backend/main.py (lines 300-350)

GET    /segments                  # List all segments
POST   /segments                  # Create new segment
GET    /segments/{segment_id}     # Get specific segment
PUT    /segments/{segment_id}     # Update segment
DELETE /segments/{segment_id}     # Delete segment
POST   /segments/evaluate         # Evaluate user against segments
```

### Experiments APIs
```
📍 File Location: /backend/main.py (lines 400-450)

GET    /experiments               # List all experiments
POST   /experiments               # Create new experiment
GET    /experiments/{exp_name}/assign # Assign user to variant
GET    /experiments/{exp_name}/results # Get experiment results
PUT    /experiments/{exp_name}    # Update experiment
```

## Database Schema

```mermaid
erDiagram
    flags ||--o{ exposures : tracks
    experiments ||--o{ exposures : tracks
    
    flags {
        id SERIAL PK
        name VARCHAR UK
        description TEXT
        is_enabled BOOLEAN
        rollout_percentage FLOAT
        targeting_rules JSONB
        created_at TIMESTAMP
        updated_at TIMESTAMP
    }
    
    configs {
        id SERIAL PK
        name VARCHAR UK
        description TEXT
        config_data JSONB
        environment VARCHAR
        is_active BOOLEAN
        created_at TIMESTAMP
        updated_at TIMESTAMP
    }
    
    segments {
        id SERIAL PK
        name VARCHAR UK
        description TEXT
        criteria JSONB
        is_active BOOLEAN
        created_at TIMESTAMP
        updated_at TIMESTAMP
    }
    
    experiments {
        id SERIAL PK
        name VARCHAR UK
        description TEXT
        flag_id INTEGER FK
        variants JSONB
        traffic_splits JSONB
        targeting_rules JSONB
        is_active BOOLEAN
        created_at TIMESTAMP
        updated_at TIMESTAMP
    }
    
    exposures {
        id SERIAL PK
        flag_name VARCHAR
        experiment_name VARCHAR
        user_id VARCHAR
        variant VARCHAR
        enabled BOOLEAN
        user_context JSONB
        timestamp TIMESTAMP
    }
```

**Location**: `/backend/models.py` and `/backend/db.py`

## Frontend Component Architecture

```mermaid
graph TD
    subgraph "React Frontend Components"
        App[App.tsx - Main Router]
        
        subgraph "Feature Management"
            ListFlags[ListFlags.tsx - Flag Management]
            ConfigSegments[ConfigSegments.tsx - Config Management]
            UserSegments[UserSegments.tsx - Segment Management]
            FlagSegments[FlagSegments.tsx - Flag Configuration]
            RemoteConfigs[RemoteConfigs.tsx - Config Interface]
        end
        
        subgraph "Integration & Docs"
            IntegrationGuide[IntegrationGuide.tsx - Developer Guide]
            APIExamples[Code Examples for 5+ languages]
        end
        
        subgraph "Shared Components"
            HTTP[HTTP Client Utils]
            State[State Management]
            UI[UI Components]
        end
    end
    
    App --> ListFlags
    App --> ConfigSegments
    App --> UserSegments
    App --> IntegrationGuide
    
    ListFlags --> HTTP
    ConfigSegments --> HTTP
    UserSegments --> HTTP
    IntegrationGuide --> APIExamples
    
    HTTP --> State
    State --> UI
```

**Locations**: 
- `/frontend/src/App.tsx` - Main application component
- `/frontend/src/components/` - All feature components
- `/frontend/src/components/IntegrationGuide.tsx` - Developer documentation

## Data Flow Examples

### 1. Creating a Feature Flag
```
User Input (Frontend) 
    ↓ POST /flags
FastAPI Validation (backend/schemas.py)
    ↓ 
Business Logic (backend/crud.py:create_flag())
    ↓
Database Insert (PostgreSQL flags table)
    ↓
Cache Invalidation (Redis)
    ↓ 
Response to Frontend
```

### 2. Evaluating a Flag for User
```
Client Request: GET /flags/new_feature?user_id=123&country=US
    ↓
API Route Handler (backend/main.py:check_flag())
    ↓
Cache Check (Redis: flag:new_feature)
    ↓ (if miss)
Database Query (PostgreSQL: SELECT * FROM flags...)
    ↓
Targeting Rules Evaluation (backend/crud.py:evaluate_targeting())
    ↓ 
Rollout Percentage Check (hash-based bucketing)
    ↓
Exposure Logging (PostgreSQL: INSERT INTO exposures...)
    ↓
Response: {enabled: true/false}
```

### 3. Segment-based Configuration
```
Client: GET /configs (with user context in headers)
    ↓
Segment Evaluation (determine which segments user belongs to)
    ↓
Config Resolution (check for segment-specific configs first)
    ↓ 
Fallback to General Config (if no segment-specific config exists)
    ↓
Response: Merged configuration object
```

## Caching Strategy

```mermaid
graph LR
    subgraph "Multi-Level Caching"
        Browser[Browser Cache<br/>5-15 minutes]
        Redis[Redis Cache<br/>5-10 minutes]
        DB[PostgreSQL<br/>Source of Truth]
    end
    
    Request --> Browser
    Browser -->|Cache Miss| Redis
    Redis -->|Cache Miss| DB
    
    DB -->|Write Back| Redis
    Redis -->|Response| Browser
```

## Security & Performance

### Rate Limiting
```
📍 Location: /backend/main.py (middleware setup)

- API requests: 1000/hour per IP
- Flag evaluations: 10000/hour per user
- Config fetches: 100/hour per client
```

### Authentication (Future)
```
- API Key based authentication
- JWT tokens for user context
- Role-based permissions for admin features
```

### Performance Optimizations
```
1. Redis caching for frequently accessed data
2. Connection pooling for PostgreSQL
3. Async/await for non-blocking I/O
4. Database indexes on frequently queried fields
5. Client-side caching with TTL
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Docker Compose Stack"
        LB[Load Balancer<br/>Nginx - Port 80]
        FE[Frontend Container<br/>React + Nginx]
        BE[Backend Container<br/>FastAPI + Uvicorn - Port 8000]
        DB[PostgreSQL Container<br/>Port 5432]
        CACHE[Redis Container<br/>Port 6379]
    end
    
    subgraph "Volumes"
        PG_DATA[PostgreSQL Data]
        BE_DATA[Backend Data]
        REDIS_DATA[Redis Data]
    end
    
    LB --> FE
    FE --> BE
    BE --> DB
    BE --> CACHE
    
    DB --> PG_DATA
    BE --> BE_DATA
    CACHE --> REDIS_DATA
```

**Location**: `/docker-compose.yml` - Complete orchestration setup

## Getting Started - Quick Reference

### 1. Start the System
```bash
docker-compose up -d
```

### 2. Access Points
- **Frontend**: http://localhost (port 80)
- **API Docs**: http://localhost:8000/docs  
- **API Base**: http://localhost:8000

### 3. Example API Calls
```bash
# Check a flag
curl "http://localhost:8000/flags/new_feature?user_id=123&country=US"

# Get configs
curl "http://localhost:8000/configs"

# Create a segment
curl -X POST "http://localhost:8000/segments" \
  -H "Content-Type: application/json" \
  -d '{"name": "premium_users", "criteria": {"tier": "premium"}}'
```

This architecture supports scalability, maintainability, and provides a clear separation of concerns between feature management, configuration, user segmentation, and experimentation.