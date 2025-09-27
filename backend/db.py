# db.py
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker as sync_sessionmaker
from urllib.parse import urlparse

def get_database_url():
    """Get database URL from environment with fallback to SQLite"""
    db_url = os.getenv("DATABASE_URL", "sqlite:///./data/optifork.db")
    
    # Convert PostgreSQL URLs to async format
    if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
        # Replace postgres:// with postgresql+asyncpg:// for async support
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://")
        return db_url
    elif db_url.startswith("sqlite://"):
        # Convert to async SQLite
        return db_url.replace("sqlite://", "sqlite+aiosqlite://")
    else:
        # Already async format or fallback
        return db_url

def get_sync_database_url():
    """Get synchronous database URL for Snowflake connector"""
    db_url = os.getenv("DATABASE_URL", "sqlite:///./data/optifork.db")
    
    # Convert async URLs back to sync for snowflake connector
    if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
        # Use psycopg2 for sync PostgreSQL
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://")
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://")
        return db_url
    elif "sqlite" in db_url:
        # Remove async parts for sync SQLite
        return db_url.replace("+aiosqlite", "").replace("sqlite://", "sqlite:///")
    else:
        return db_url

# Database URLs
DATABASE_URL = get_database_url()
SYNC_DATABASE_URL = get_sync_database_url()

# Engine configuration based on database type
def get_engine_config():
    """Get engine configuration based on database type"""
    if "postgresql" in DATABASE_URL:
        return {
            "echo": False,  # Disable SQL logging in production
            "pool_size": 10,
            "max_overflow": 20,
            "pool_pre_ping": True,
            "pool_recycle": 3600
        }
    else:
        return {
            "echo": True,
            "connect_args": {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
        }

# Async engine and session (for FastAPI routes)
engine = create_async_engine(DATABASE_URL, **get_engine_config())
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# Sync engine and session (for Snowflake connector)
sync_engine_config = get_engine_config()
if "postgresql" in SYNC_DATABASE_URL:
    sync_engine_config.update({
        "pool_size": 5,  # Smaller pool for sync operations
        "max_overflow": 10
    })

sync_engine = create_engine(SYNC_DATABASE_URL, **sync_engine_config)
SyncSessionLocal = sync_sessionmaker(bind=sync_engine, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    """FastAPI dependency for async database sessions"""
    async with SessionLocal() as session:
        yield session

def get_sync_db():
    """Get synchronous database session for Snowflake connector"""
    return SyncSessionLocal()

async def init_database():
    """Initialize database tables"""
    try:
        # Import models to ensure they're registered
        from models import Base
        
        # Create all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
        print(f"✅ Database initialized successfully with {DATABASE_URL}")
        return True
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False

def get_database_info():
    """Get current database configuration info"""
    db_type = "PostgreSQL" if "postgresql" in DATABASE_URL else "SQLite"
    return {
        "type": db_type,
        "url": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL,  # Hide credentials
        "sync_url": SYNC_DATABASE_URL.split("@")[-1] if "@" in SYNC_DATABASE_URL else SYNC_DATABASE_URL
    }
