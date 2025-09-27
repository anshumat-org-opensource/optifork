# OptiFork System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Backend Components](#backend-components)
4. [Frontend Components](#frontend-components)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Authentication & Authorization](#authentication--authorization)
8. [Feature Flag System](#feature-flag-system)
9. [Experiment System](#experiment-system)
10. [Data Export Integration](#data-export-integration)
11. [Docker Configuration](#docker-configuration)
12. [File Structure](#file-structure)
13. [Data Flow](#data-flow)
14. [Development Workflow](#development-workflow)

---

## System Overview

OptiFork is a feature flag and A/B testing platform that allows developers to control feature rollouts and run experiments. The system consists of:

- **Backend**: FastAPI-based REST API with SQLite database
- **Frontend**: React TypeScript application with Tailwind CSS
- **Database**: SQLite for local development (PostgreSQL option available)
- **Integration**: Snowflake data warehouse export capability
- **Authentication**: Role-based access control system

---

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │    Backend      │    │    Database     │
│   (React TS)    │◄──►│   (FastAPI)     │◄──►│   (SQLite)      │
│   Port: 3000    │    │   Port: 8000    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └─────────────►│   Snowflake     │◄─────────────┘
                        │   Integration   │
                        └─────────────────┘
```

### Core Components:
1. **Feature Flags**: Control feature rollouts with targeting rules
2. **Experiments**: A/B testing with variant assignments
3. **User Management**: Role-based access control
4. **Data Export**: Snowflake integration for analytics
5. **Exposures Tracking**: Log when users are exposed to flags/experiments

---

## Backend Components

### Core Files Structure
```
backend/
├── main.py              # FastAPI application entry point
├── db.py               # Database configuration and session management
├── models.py           # SQLAlchemy database models
├── requirements.txt    # Python dependencies
├── scheduler.py        # Background task scheduler for exports
├── routers/
│   └── integrations.py # Snowflake integration endpoints
└── integrations/
    └── snowflake_connector.py # Snowflake connection and export logic
```

### 1. main.py - Application Entry Point

**Purpose**: Main FastAPI application with all endpoints and middleware setup.

**Key Components**:
- **CORS Configuration**: Allows frontend to communicate with backend
- **Database Initialization**: Creates tables on startup
- **Feature Flag Endpoints**: CRUD operations for feature flags
- **Experiment Endpoints**: CRUD operations for A/B tests
- **User Management**: Authentication and user operations
- **Exposure Logging**: Tracks when users see flags/experiments

**Key Endpoints**:
```python
# Feature Flags
GET  /flags                    # List all feature flags
POST /flags                    # Create new feature flag
GET  /flags/{name}            # Evaluate flag for user
PUT  /flags/{name}            # Update feature flag
GET  /flags/{name}/exposures  # Get flag exposure logs

# Experiments  
GET  /experiments             # List all experiments
POST /experiments             # Create new experiment
GET  /experiments/{name}      # Get experiment details
PUT  /experiments/{name}      # Update experiment
POST /experiments/{name}/assign # Assign user to variant

# Users & Auth
POST /users                   # Create new user
POST /login                   # User login
GET  /users                   # List users (admin only)
```

**Flag Evaluation Logic**:
1. Check targeting rules first - if user attributes match any rule, return that result
2. If no rules match, use consistent hashing on user_id + flag_name for rollout percentage
3. Log exposure event for analytics

### 2. models.py - Database Models

**Purpose**: SQLAlchemy models defining database schema.

**Models**:

```python
class FeatureFlag:
    id: int (Primary Key)
    name: str (Unique)
    description: str
    rollout: float (0.0 to 1.0)
    rules: JSON (targeting rules)
    created_at: datetime
    updated_at: datetime

class Experiment:
    id: int (Primary Key) 
    name: str (Unique)
    description: str
    variants: JSON (list of variants with weights)
    created_at: datetime
    updated_at: datetime

class FlagExposure:
    id: int (Primary Key)
    flag_name: str
    user_id: str
    enabled: bool
    timestamp: datetime
    user_attributes: JSON

class User:
    id: int (Primary Key)
    username: str (Unique)
    email: str (Unique) 
    password_hash: str
    role: str (Administrator/Developer/Viewer)
    permissions: JSON (detailed permissions)
    created_at: datetime
```

### 3. db.py - Database Configuration

**Purpose**: Database connection and session management.

**Key Functions**:
- `get_database_url()`: Returns SQLite connection string
- `get_db()`: FastAPI dependency for database sessions
- `init_database()`: Creates all tables on startup

**Database Connection**:
- **Development**: SQLite file at `./data/optifork.db`
- **Production**: Can be configured for PostgreSQL via environment variables

### 4. integrations/snowflake_connector.py - Data Warehouse Integration

**Purpose**: Handles all Snowflake connectivity and data export operations.

**Key Components**:

**SnowflakeConnector Class**:
```python
class SnowflakeConnector:
    def configure(config: dict)         # Set connection parameters
    def connect() -> bool               # Establish connection
    def create_tables() -> bool         # Create Snowflake tables
    def export_feature_flags(since)     # Export flag data
    def export_flag_exposures(since)    # Export exposure logs
    def export_experiments(since)       # Export experiment data
    def full_export(db, since)          # Export all data types
    def save_config(config, db)         # Persist config to database
    def load_saved_config(db)           # Load config from database
```

**Export Process**:
1. Connect to Snowflake using saved credentials
2. Create tables if they don't exist:
   - `OPTIFORK_FEATURE_FLAGS`
   - `OPTIFORK_FLAG_EXPOSURES` 
   - `OPTIFORK_EXPERIMENTS`
   - `OPTIFORK_EXPORT_LOGS`
3. Extract data from SQLite database
4. Transform and load into Snowflake tables
5. Log export results for monitoring

### 5. scheduler.py - Background Tasks

**Purpose**: Automated data export scheduling.

**Features**:
- **Daily Export**: Full data export at 2 AM UTC
- **Hourly Export**: Incremental export of last hour's data
- **Configurable**: Can be enabled/disabled via API

**Scheduler Setup**:
```python
# Daily full export at 2 AM
scheduler.add_job(
    func=daily_export,
    trigger="cron", 
    hour=2,
    minute=0
)

# Hourly incremental export
scheduler.add_job(
    func=hourly_export,
    trigger="interval",
    hours=1
)
```

---

## Frontend Components

### Core Structure
```
frontend/src/
├── App.tsx                    # Main application with sidebar navigation
├── components/
│   ├── Login.tsx             # Authentication form
│   ├── Header.tsx            # Top navigation bar
│   ├── ProtectedRoute.tsx    # Permission-based route guard
│   │
│   ├── CreateFlag.tsx        # Feature flag creation form
│   ├── ListFlags.tsx         # Feature flags management
│   ├── TestFlag.tsx          # Flag evaluation testing
│   ├── FlagExposures.tsx     # Flag exposure analytics
│   │
│   ├── CreateExperiment.tsx  # Experiment creation form
│   ├── ListExperiments.tsx   # Experiment management
│   ├── AssignUserToVariant.tsx # Manual variant assignment
│   ├── ExperimentResults.tsx # Experiment analytics
│   │
│   ├── IntegrationGuide.tsx  # SDK integration documentation
│   ├── SnowflakeIntegration.tsx # Data export configuration
│   └── UserManagement.tsx    # User and role management
└── index.css                 # Tailwind CSS styles
```

### 1. App.tsx - Main Application

**Purpose**: Main application component with collapsible sidebar navigation and routing logic.

**Key Features**:
- **Collapsible Sidebar**: Left navigation with feature flags, experiments, etc.
- **Permission-Based Navigation**: Shows/hides sections based on user permissions
- **User State Management**: Handles login state and user persistence
- **Route Protection**: Ensures users can only access permitted sections

**Navigation Structure**:
```tsx
// Main navigation sections
- Feature Flags (🚩)
  - Manage (view/create/edit flags)
  - Test (evaluate flags with custom attributes)  
  - Exposures (view flag usage analytics)

- Experiments (🧪)
  - Manage (view/create/edit experiments)
  - Assign Users (manual variant assignment)
  - Results (experiment analytics)

- Integration (🔌)
  - SDK documentation and setup guides

- Data Export (📊) [Admin only]
  - Snowflake integration configuration

- Users (👥) [Admin only] 
  - User management and role assignment
```

**Permission System**:
```tsx
interface User {
  permissions: {
    feature_flags: { view: bool, manage: bool, test: bool }
    experiments: { view: bool, manage: bool, assign: bool, results: bool }
    exposures: { view: bool }
    integration: { view: bool }
  }
}
```

### 2. Feature Flag Components

#### CreateFlag.tsx
**Purpose**: Form for creating new feature flags with targeting rules.

**Key Features**:
- **Basic Configuration**: Name, description, rollout percentage
- **Targeting Rules**: Field-operator-value rules for user segmentation
- **Rollout Slider**: Visual percentage selector with real-time preview
- **Rule Management**: Add/remove multiple targeting conditions

**Rule System**:
```tsx
interface Rule {
  field: string    // e.g., "country", "age", "plan"
  op: string      // "eq", "ne", "gt", "lt"  
  value: string   // target value
}
```

#### ListFlags.tsx
**Purpose**: Display and manage existing feature flags.

**Features**:
- **Flag Overview**: Shows name, description, rollout percentage, rule count
- **Inline Editing**: Click to edit any flag configuration
- **Visual Indicators**: Progress bars for rollout percentages
- **Rule Display**: Shows targeting rules in readable format

#### TestFlag.tsx
**Purpose**: Test flag evaluation with custom user attributes.

**Testing Process**:
1. Select flag from dropdown
2. Enter user ID
3. Provide user attributes as JSON
4. Click "Test" to see evaluation result
5. Shows whether flag is enabled/disabled for that user

**Evaluation Preview**:
- Shows flag details (rollout %, rules)
- Explains evaluation logic
- Real-time JSON validation for attributes

#### FlagExposures.tsx
**Purpose**: Analytics dashboard showing flag exposure logs.

**Analytics Features**:
- **Filter by Flag**: Show exposures for specific flags
- **Statistics**: Total exposures, enabled/disabled counts, enabled rate
- **Recent Activity**: Chronological list of flag evaluations
- **User Tracking**: See which users encountered which flags

### 3. Experiment Components

#### CreateExperiment.tsx
**Purpose**: Form for creating A/B test experiments.

**Features**:
- **Basic Info**: Experiment name and description
- **Variant Management**: Add/remove variants with traffic allocation
- **Traffic Distribution**: Ensure variants total 100%
- **Validation**: Prevents invalid configurations

**Variant Structure**:
```tsx
interface Variant {
  name: string      // e.g., "control", "treatment_a"
  weight: number    // percentage of traffic (0-100)
}
```

#### ListExperiments.tsx  
**Purpose**: Display and manage active experiments.

**Features**:
- **Experiment Cards**: Show name, description, variant distribution
- **Status Indicators**: Visual representation of traffic allocation
- **Quick Actions**: Edit, delete, view results
- **Traffic Visualization**: Progress bars showing variant weights

#### AssignUserToVariant.tsx
**Purpose**: Manually assign specific users to experiment variants.

**Use Cases**:
- Testing specific scenarios
- VIP user management  
- Quality assurance
- Customer support requests

#### ExperimentResults.tsx
**Purpose**: Analytics dashboard for experiment performance.

**Metrics** (placeholder for future implementation):
- Variant performance comparison
- Statistical significance
- Conversion rates
- User engagement metrics

### 4. Integration Components

#### IntegrationGuide.tsx
**Purpose**: Documentation for implementing OptiFork SDKs.

**Content Sections**:
- **Language Selection**: JavaScript, Python, Java, etc.
- **Installation Instructions**: Package manager commands
- **Code Examples**: Flag evaluation, experiment assignment
- **Best Practices**: Implementation recommendations
- **API Reference**: Endpoint documentation

#### SnowflakeIntegration.tsx
**Purpose**: Configure data export to Snowflake data warehouse.

**Configuration Flow**:
1. **Connection Setup**: Account, user, password, warehouse, database, schema
2. **Connection Test**: Verify credentials and network connectivity  
3. **Export Options**: Select data types (flags, experiments, exposures)
4. **Schedule Configuration**: One-time or recurring exports
5. **Status Monitoring**: View export history and results

**Export Features**:
- **Incremental Exports**: Only export data since last run
- **Full Exports**: Export all historical data
- **Background Processing**: Large exports run asynchronously
- **Error Handling**: Detailed error messages and troubleshooting

### 5. User Management

#### Login.tsx
**Purpose**: Authentication form with role-based access.

**Features**:
- **Username/Password Auth**: Simple credential-based login
- **Remember Me**: Persistent login sessions
- **Error Handling**: Clear validation messages
- **Role Recognition**: Different UI based on user permissions

#### UserManagement.tsx
**Purpose**: Admin interface for managing users and roles.

**User Management**:
- **Create Users**: Add new team members
- **Role Assignment**: Administrator, Developer, Viewer
- **Permission Control**: Granular access controls
- **User Overview**: List all users with roles and status

**Role Definitions**:
- **Administrator**: Full system access, user management
- **Developer**: Create/modify flags and experiments
- **Viewer**: Read-only access to flags and experiments

#### ProtectedRoute.tsx
**Purpose**: HOC for enforcing permission-based access.

**Usage**:
```tsx
<ProtectedRoute user={user} section="feature_flags" permission="manage">
  <CreateFlag />
</ProtectedRoute>
```

**Permission Checks**:
- Validates user has required permission for section
- Hides content if access denied
- Shows appropriate error messages

---

## Database Schema

### Tables Overview

```sql
-- Feature flag definitions
feature_flags (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  rollout REAL NOT NULL DEFAULT 0.0,
  rules TEXT, -- JSON array of targeting rules
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- A/B test experiment definitions  
experiments (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  variants TEXT NOT NULL, -- JSON array of variants
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- User exposure logs for analytics
flag_exposures (
  id INTEGER PRIMARY KEY,
  flag_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_attributes TEXT -- JSON of user attributes
)

-- User accounts and permissions
users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Viewer',
  permissions TEXT, -- JSON permissions object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- Snowflake integration configuration
integration_configs (
  id INTEGER PRIMARY KEY,
  service TEXT NOT NULL DEFAULT 'snowflake',
  config TEXT NOT NULL, -- JSON configuration
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Data Relationships

```
Users (1) ──── (N) FlagExposures
FeatureFlags (1) ──── (N) FlagExposures  
Experiments (1) ──── (N) ExperimentAssignments (future)
```

---

## API Endpoints

### Feature Flags API

```http
# Get all feature flags
GET /flags
Response: Array<FeatureFlag>

# Create new feature flag  
POST /flags
Body: {
  name: string,
  description?: string,
  rollout: number,
  rules: Rule[]
}
Response: { message: string, flag: FeatureFlag }

# Evaluate flag for user
GET /flags/{flag_name}?user_id={id}&{attributes}
Response: {
  flag: string,
  user_id: string, 
  enabled: boolean,
  reason: string
}

# Update existing flag
PUT /flags/{flag_name}  
Body: FeatureFlag
Response: { message: string }

# Get flag exposure logs
GET /flags/{flag_name}/exposures?limit={n}
Response: Array<FlagExposure>
```

### Experiments API

```http  
# Get all experiments
GET /experiments
Response: Array<Experiment>

# Create new experiment
POST /experiments
Body: {
  name: string,
  description?: string,
  variants: Variant[]
}
Response: { message: string, experiment: Experiment }

# Assign user to variant
POST /experiments/{name}/assign
Body: {
  user_id: string,
  user_attributes?: object
}
Response: {
  experiment: string,
  user_id: string,
  variant: string
}

# Update experiment
PUT /experiments/{name}
Body: Experiment  
Response: { message: string }
```

### User Management API

```http
# User login
POST /login
Body: { username: string, password: string }
Response: { message: string, user: User }

# Create new user  
POST /users
Body: {
  username: string,
  email: string, 
  password: string,
  role: string
}
Response: { message: string, user: User }

# Get all users (admin only)
GET /users
Response: Array<User>

# Delete user (admin only)
DELETE /users/{user_id}
Response: { message: string }
```

### Integration API

```http
# Configure Snowflake connection
POST /integrations/snowflake/configure
Body: {
  account: string,
  user: string,
  password: string,
  warehouse: string,
  database: string,
  schema: string
}
Response: { success: boolean, message: string }

# Test Snowflake connection
GET /integrations/snowflake/test-connection
Response: { success: boolean, message: string }

# Export data to Snowflake
POST /integrations/snowflake/export  
Body: {
  data_types: string[],
  since_hours?: number,
  full_export: boolean
}
Response: {
  success: boolean,
  message: string,
  records_exported?: object
}

# Get export status
GET /integrations/snowflake/export-status
Response: {
  success: boolean,
  recent_exports: Array<ExportLog>,
  table_counts: object
}
```

---

## Authentication & Authorization

### Authentication Flow

1. **Login Request**: User submits username/password to `/login`
2. **Credential Validation**: Backend verifies against user database
3. **Session Creation**: User object stored in localStorage (client-side)
4. **Request Authorization**: Each API call includes user context
5. **Permission Validation**: Backend checks user permissions for operations

### Permission System

**Role-Based Access Control (RBAC)**:

```typescript
// User permissions structure
interface UserPermissions {
  feature_flags: {
    view: boolean     // Can see flags list
    manage: boolean   // Can create/edit flags  
    test: boolean     // Can test flag evaluation
  }
  experiments: {
    view: boolean     // Can see experiments
    manage: boolean   // Can create/edit experiments
    assign: boolean   // Can manually assign users
    results: boolean  // Can view experiment results
  }
  exposures: {
    view: boolean     // Can view exposure logs
  }
  integration: {
    view: boolean     // Can see integration docs
  }
}
```

**Predefined Roles**:

```typescript
const ROLE_PERMISSIONS = {
  Administrator: {
    // Full access to everything
    feature_flags: { view: true, manage: true, test: true },
    experiments: { view: true, manage: true, assign: true, results: true },
    exposures: { view: true },
    integration: { view: true }
  },
  Developer: {
    // Can manage flags/experiments but not admin functions
    feature_flags: { view: true, manage: true, test: true },
    experiments: { view: true, manage: true, assign: true, results: true },
    exposures: { view: true },
    integration: { view: true }
  },
  Viewer: {
    // Read-only access
    feature_flags: { view: true, manage: false, test: true },
    experiments: { view: true, manage: false, assign: false, results: true },
    exposures: { view: true },
    integration: { view: true }
  }
}
```

### Route Protection

**Frontend Protection**:
```tsx
// Navigation visibility based on permissions
{canViewSection('feature_flags') && (
  <nav-item>Feature Flags</nav-item>
)}

// Component-level protection  
<ProtectedRoute user={user} section="feature_flags" permission="manage">
  <CreateFlag />
</ProtectedRoute>
```

**Backend Protection**:
```python
# Permission checking decorator (conceptual)
@require_permission("feature_flags", "manage") 
async def create_flag(flag_data: dict):
    # Create flag logic
    pass
```

---

## Feature Flag System

### Flag Evaluation Algorithm

```python
def evaluate_flag(flag: FeatureFlag, user_id: str, user_attributes: dict) -> bool:
    # Step 1: Check targeting rules first
    for rule in flag.rules:
        if evaluate_rule(rule, user_attributes):
            return rule.enabled
    
    # Step 2: If no rules match, use consistent hashing for rollout
    hash_key = f"{user_id}:{flag.name}"
    hash_value = sha256(hash_key.encode()).hexdigest()
    bucket = int(hash_value[:8], 16) / (2**32)  # 0.0 to 1.0
    
    return bucket < flag.rollout

def evaluate_rule(rule: Rule, attributes: dict) -> bool:
    user_value = attributes.get(rule.field)
    if user_value is None:
        return False
        
    if rule.op == "eq":
        return str(user_value) == rule.value
    elif rule.op == "ne": 
        return str(user_value) != rule.value
    elif rule.op == "gt":
        return float(user_value) > float(rule.value)
    elif rule.op == "lt":
        return float(user_value) < float(rule.value)
    
    return False
```

### Flag Configuration

**Basic Flag**:
```json
{
  "name": "new_checkout_flow",
  "description": "Enable new checkout experience", 
  "rollout": 0.25,  // 25% of users
  "rules": []
}
```

**Flag with Targeting Rules**:
```json
{
  "name": "premium_features",
  "description": "Show premium features",
  "rollout": 0.0,  // Default off
  "rules": [
    {
      "field": "plan", 
      "op": "eq",
      "value": "premium",
      "enabled": true  // All premium users get feature
    },
    {
      "field": "country",
      "op": "eq", 
      "value": "US",
      "enabled": false  // Disable for US users (overrides rollout)
    }
  ]
}
```

### Exposure Logging

Every flag evaluation is logged for analytics:

```python
# Log exposure event
exposure = FlagExposure(
    flag_name=flag.name,
    user_id=user_id,
    enabled=result,
    timestamp=datetime.utcnow(),
    user_attributes=json.dumps(user_attributes)
)
db.add(exposure)
```

**Exposure Analytics**:
- Total evaluations per flag
- Enabled/disabled ratios  
- User segmentation analysis
- Time-series exposure trends

---

## Experiment System

### Experiment Configuration

**Basic A/B Test**:
```json
{
  "name": "button_color_test",
  "description": "Test red vs blue button colors",
  "variants": [
    { "name": "control", "weight": 50 },
    { "name": "red_button", "weight": 25 },
    { "name": "blue_button", "weight": 25 }
  ]
}
```

### Variant Assignment Algorithm

```python
def assign_variant(experiment: Experiment, user_id: str) -> str:
    # Use consistent hashing for stable assignments
    hash_key = f"{user_id}:{experiment.name}"
    hash_value = sha256(hash_key.encode()).hexdigest()
    bucket = int(hash_value[:8], 16) / (2**32) * 100  # 0-100
    
    # Find variant based on cumulative weights
    cumulative = 0
    for variant in experiment.variants:
        cumulative += variant.weight
        if bucket < cumulative:
            return variant.name
    
    # Fallback to first variant
    return experiment.variants[0].name
```

### Experiment Lifecycle

1. **Create**: Define experiment with variants and traffic allocation
2. **Launch**: Start assigning users to variants
3. **Monitor**: Track assignment logs and performance metrics
4. **Analyze**: Compare variant performance (future feature)
5. **Conclude**: Stop experiment and implement winning variant

---

## Data Export Integration

### Snowflake Integration Architecture

```
OptiFork SQLite ──── Extract ──── Transform ──── Load ──── Snowflake
     │                   │            │           │           │
     ├─ feature_flags    │            │           │    OPTIFORK_FEATURE_FLAGS
     ├─ flag_exposures   │────────────┤           │    OPTIFORK_FLAG_EXPOSURES  
     ├─ experiments      │            │           │    OPTIFORK_EXPERIMENTS
     └─ users           │            │           │    OPTIFORK_EXPORT_LOGS
                        │            │           │
                   Data Extraction   Schema      Bulk Insert
                                   Mapping
```

### Export Process

**1. Configuration**:
```python
snowflake_config = {
    "account": "abc12345.us-east-1.snowflakecomputing.com",
    "user": "etl_user", 
    "password": "secure_password",
    "warehouse": "COMPUTE_WH",
    "database": "OPTIFORK_DB", 
    "schema": "PUBLIC"
}
```

**2. Table Creation**:
```sql
-- Snowflake tables mirror SQLite schema
CREATE TABLE OPTIFORK_FEATURE_FLAGS (
    id NUMBER,
    name VARCHAR(255), 
    description TEXT,
    rollout FLOAT,
    rules VARIANT, -- JSON
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE OPTIFORK_FLAG_EXPOSURES (
    id NUMBER,
    flag_name VARCHAR(255),
    user_id VARCHAR(255), 
    enabled BOOLEAN,
    timestamp TIMESTAMP,
    user_attributes VARIANT -- JSON
);
```

**3. Data Extraction**:
```python
# Extract feature flags
cursor.execute("SELECT * FROM feature_flags WHERE updated_at > ?", [since])
flags = cursor.fetchall()

# Transform to Snowflake format
for flag in flags:
    snowflake_data.append({
        'id': flag.id,
        'name': flag.name,
        'description': flag.description,
        'rollout': flag.rollout,
        'rules': json.loads(flag.rules) if flag.rules else [],
        'created_at': flag.created_at,
        'updated_at': flag.updated_at
    })
```

**4. Bulk Load**:
```python
# Use Snowflake's bulk insert capability
snowflake_cursor.executemany(
    "INSERT INTO OPTIFORK_FEATURE_FLAGS VALUES (?, ?, ?, ?, ?, ?, ?)",
    snowflake_data
)
```

### Export Scheduling

**Manual Exports**:
- On-demand via UI
- Immediate or background processing
- Full or incremental options

**Automated Exports**:
- Daily full export at 2 AM UTC
- Hourly incremental exports  
- Configurable schedules
- Error notifications

### Monitoring & Logging

**Export Logs**:
```sql
CREATE TABLE OPTIFORK_EXPORT_LOGS (
    id NUMBER,
    export_type VARCHAR(50),  -- 'feature_flags', 'full_export', etc
    records_exported NUMBER,
    export_status VARCHAR(20), -- 'success', 'failed', 'partial'
    error_message TEXT,
    exported_at TIMESTAMP
);
```

**Status Dashboard**:
- Recent export history
- Success/failure rates
- Record counts per table
- Error troubleshooting

---

## Docker Configuration

### Container Architecture

```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"] 
    volumes: ["backend_data:/app/data"]
    environment:
      DATABASE_URL: sqlite:///./data/optifork.db
      ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:80"
    
  frontend:
    build: ./frontend
    ports: ["80:80", "3000:80"]
    depends_on: [backend]
    
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --appendonly yes
```

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile  

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Volume Management

**Backend Data**:
- `backend_data:/app/data` - SQLite database persistence
- Survives container restarts
- Shared across container updates

**Development Workflow**:
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart specific service
docker-compose restart frontend

# Rebuild with cache clearing
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

---

## File Structure

### Complete Project Structure

```
optifork/
├── README.md
├── docker-compose.yml           # Container orchestration
├── SYSTEM_DOCUMENTATION.md     # This file
│
├── backend/                     # Python FastAPI backend
│   ├── Dockerfile
│   ├── requirements.txt        # Python dependencies
│   ├── main.py                # FastAPI app with all endpoints
│   ├── db.py                  # Database configuration
│   ├── models.py              # SQLAlchemy models
│   ├── scheduler.py           # Background task scheduler
│   ├── data/                  # SQLite database directory
│   │   └── optifork.db       # Main database file
│   ├── routers/              # API route modules
│   │   └── integrations.py   # Snowflake integration endpoints
│   └── integrations/         # External service integrations
│       └── snowflake_connector.py # Snowflake client
│
├── frontend/                   # React TypeScript frontend
│   ├── Dockerfile
│   ├── nginx.conf            # Nginx configuration
│   ├── package.json          # Node.js dependencies  
│   ├── tsconfig.json         # TypeScript configuration
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   ├── vite.config.ts        # Vite build configuration
│   ├── index.html            # HTML template
│   ├── public/               # Static assets
│   └── src/                  # React application source
│       ├── index.css         # Global styles (Tailwind)
│       ├── main.tsx          # React entry point
│       ├── App.tsx           # Main app with navigation
│       └── components/       # React components
│           ├── Login.tsx                    # Authentication
│           ├── Header.tsx                   # Top navigation
│           ├── ProtectedRoute.tsx          # Permission wrapper
│           │
│           ├── CreateFlag.tsx              # Flag creation
│           ├── ListFlags.tsx               # Flag management  
│           ├── TestFlag.tsx                # Flag testing
│           ├── FlagExposures.tsx           # Flag analytics
│           │
│           ├── CreateExperiment.tsx        # Experiment creation
│           ├── ListExperiments.tsx         # Experiment management
│           ├── AssignUserToVariant.tsx     # Manual assignment
│           ├── ExperimentResults.tsx       # Experiment analytics
│           │
│           ├── IntegrationGuide.tsx        # SDK documentation
│           ├── SnowflakeIntegration.tsx    # Data export config
│           └── UserManagement.tsx          # User administration
│
└── volumes/                    # Docker volume data (auto-created)
    ├── backend_data/          # SQLite database storage
    └── redis_data/           # Redis cache storage
```

### Key Configuration Files

**package.json** - Frontend dependencies:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0", 
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^3.3.0",
    "vite": "^4.4.0"
  }
}
```

**requirements.txt** - Backend dependencies:
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
pydantic==2.5.0
python-multipart==0.0.6
snowflake-connector-python==3.5.0
apscheduler==3.10.4
bcrypt==4.1.2
```

---

## Data Flow

### Flag Evaluation Flow

```
1. User Request ──── 2. Frontend ──── 3. API Call ──── 4. Backend
        │              │                   │              │
        │              │                   │              ▼
        │              │                   │         Flag Evaluation
        │              │                   │              │
        │              │                   │              ▼
        │              │                   │         Log Exposure  
        │              │                   │              │
        │              │                   │              ▼
        │              │          ◄────── 5. Response ─────┘
        │              │                   
        │              ▼
        └──── 6. Feature Enabled/Disabled
```

**Detailed Steps**:

1. **User Request**: Application needs to check if feature should be shown
2. **Frontend**: React component calls flag evaluation
3. **API Call**: `GET /flags/new_checkout?user_id=123&country=US&plan=premium`
4. **Backend Processing**:
   - Load flag configuration from database
   - Apply targeting rules evaluation  
   - Calculate rollout percentage with consistent hashing
   - Determine final enabled/disabled result
5. **Exposure Logging**: Record evaluation in flag_exposures table
6. **Response**: Return result to frontend
7. **Feature Toggle**: Show/hide feature based on result

### Data Export Flow

```
1. Schedule Trigger ──── 2. Extract ──── 3. Transform ──── 4. Load ──── 5. Log
        │                    │              │               │           │
   ┌────┴──────┐         ┌───▼────┐    ┌───▼─────┐   ┌────▼─────┐ ┌───▼────┐
   │   Daily   │         │SQLite  │    │ Data    │   │Snowflake │ │Export  │
   │  2:00 AM  │         │Query   │    │Mapping  │   │Bulk      │ │Status  │
   │           │         │        │    │         │   │Insert    │ │        │
   │  Hourly   │         │Cursor  │    │JSON     │   │COPY      │ │Success │
   │  Export   │         │Fetch   │    │Parse    │   │INTO      │ │Failed  │
   └───────────┘         └────────┘    └─────────┘   └──────────┘ └────────┘
```

**Export Steps**:

1. **Schedule Trigger**: APScheduler triggers export job
2. **Data Extraction**: 
   - Connect to SQLite database
   - Query tables with optional timestamp filtering
   - Fetch results in batches
3. **Data Transformation**:
   - Convert SQLite row format to Snowflake-compatible format
   - Handle JSON column parsing
   - Apply data type conversions
4. **Data Loading**:
   - Connect to Snowflake
   - Create tables if they don't exist
   - Bulk insert using COPY INTO or INSERT statements
5. **Logging**: Record export results in OPTIFORK_EXPORT_LOGS

### Authentication Flow

```
1. Login Form ──── 2. API Call ──── 3. Validation ──── 4. Session ──── 5. Permissions
      │                 │               │                │              │
   Username          POST /login    Password Hash    localStorage   Permission
   Password             │          Comparison        User Object      Check
      │                 │               │                │              │
      └─────────────────┴───────────────┴────────────────┴──────────────┘
                                       │
                              6. Route Protection
```

**Authentication Steps**:

1. **Login Form**: User enters credentials
2. **API Call**: `POST /login` with username/password
3. **Validation**: 
   - Look up user in database
   - Verify password hash using bcrypt
   - Check account status
4. **Session Creation**:
   - Return user object with permissions
   - Store in localStorage for persistence
5. **Permission Loading**: Load role-based permissions
6. **Route Protection**: Enforce access controls on navigation

---

## Development Workflow

### Local Development Setup

**1. Clone Repository**:
```bash
git clone <repository-url>
cd optifork
```

**2. Start Development Environment**:
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

**3. Access Applications**:
- Frontend: http://localhost:3000 or http://localhost:80
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

**4. Development Workflow**:
```bash
# Make code changes
# Frontend changes: auto-rebuild via Vite HMR
# Backend changes: restart container

# Restart specific service
docker-compose restart backend

# Rebuild with cache clearing
docker-compose build --no-cache frontend
docker-compose up -d
```

### Code Changes and Testing

**Frontend Development**:
- Edit files in `frontend/src/`
- Changes auto-reload via Vite hot module replacement
- For new dependencies: rebuild container
- For major changes: restart container

**Backend Development**:
- Edit files in `backend/`
- Restart container to apply changes: `docker-compose restart backend`
- Database changes: handled automatically by SQLAlchemy
- For new dependencies: rebuild container

**Database Changes**:
- SQLAlchemy handles schema creation automatically
- Database file persists in Docker volume
- For fresh start: `docker-compose down -v` (destroys data)

### Testing Features

**1. Create Test User**:
```bash
# Access backend container
docker exec -it optifork-backend bash

# Create admin user (example)
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@test.com", 
    "password": "password",
    "role": "Administrator"
  }'
```

**2. Test Feature Flags**:
- Login to frontend
- Navigate to Feature Flags > Manage
- Create test flag with 50% rollout
- Use Test tab to verify evaluation logic
- Check Exposures tab for logged events

**3. Test Experiments**:
- Navigate to Experiments > Manage  
- Create A/B test with multiple variants
- Use Assign Users to test specific assignments
- Verify consistent variant assignment

**4. Test Snowflake Integration**:
- Navigate to Data Export
- Configure Snowflake credentials
- Test connection
- Run sample export
- Verify data in Snowflake tables

### Troubleshooting

**Common Issues**:

1. **Frontend not updating**:
   - Rebuild container: `docker-compose build --no-cache frontend`
   - Check browser cache
   - Verify file changes saved

2. **Backend API errors**:
   - Check logs: `docker-compose logs backend`
   - Verify database file exists in volume
   - Check port conflicts

3. **Database issues**:
   - Reset database: `docker-compose down -v && docker-compose up -d`
   - Check SQLite file permissions
   - Verify volume mounting

4. **Snowflake connection fails**:
   - Verify account URL format
   - Check network connectivity
   - Validate credentials and permissions
   - Review error messages in logs

**Logging and Debugging**:
```bash
# View all logs
docker-compose logs -f

# View specific service logs  
docker-compose logs -f backend
docker-compose logs -f frontend

# Access container shell
docker exec -it optifork-backend bash
docker exec -it optifork-frontend sh

# Check database
docker exec -it optifork-backend sqlite3 /app/data/optifork.db
sqlite> .tables
sqlite> SELECT * FROM feature_flags;
```

---

## System Performance and Scaling

### Current Limitations

**Single Node Architecture**:
- SQLite database (not suitable for high concurrency)
- No load balancing
- Limited to single server deployment

**Performance Characteristics**:
- Good for: Development, small teams, low-traffic applications
- SQLite handles ~100k requests/day comfortably
- Memory usage: ~50MB backend, ~20MB frontend

### Scaling Considerations

**For Production Scale**:

1. **Database Migration**:
   ```python
   # Switch to PostgreSQL
   DATABASE_URL = "postgresql://user:pass@postgres:5432/optifork"
   ```

2. **Caching Layer**:
   ```python
   # Add Redis for flag caching
   redis_client = Redis(host='redis', port=6379)
   
   def get_cached_flag(name):
       cached = redis_client.get(f"flag:{name}")
       if cached:
           return json.loads(cached)
       return None
   ```

3. **Load Balancing**:
   ```yaml
   # Multiple backend instances
   backend:
     deploy:
       replicas: 3
     depends_on: [postgres, redis]
   ```

4. **Monitoring**:
   - Application metrics (Prometheus)
   - Log aggregation (ELK stack)
   - Health checks and alerts
   - Performance monitoring

### Best Practices

**Development**:
- Use feature branches for changes
- Test flag evaluation logic thoroughly
- Validate Snowflake connections before production
- Monitor export job performance

**Production**:
- Regular database backups
- Monitor flag evaluation latency
- Set up alerting for export failures
- Review flag usage and cleanup unused flags
- Implement flag lifecycle management

**Security**:
- Use environment variables for sensitive config
- Implement proper authentication tokens
- Encrypt Snowflake credentials
- Regular security audits of user permissions
- HTTPS termination at load balancer

---

This documentation provides a comprehensive understanding of the OptiFork system architecture, components, and operations. Each section explains both the technical implementation and the business logic behind design decisions.