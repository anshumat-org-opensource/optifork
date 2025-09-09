# db.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker as sync_sessionmaker

DATABASE_URL = "sqlite+aiosqlite:///./data/optifork.db"
SYNC_DATABASE_URL = "sqlite:///./data/optifork.db"

# Async engine and session (for FastAPI routes)
engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# Sync engine and session (for Snowflake connector)
sync_engine = create_engine(SYNC_DATABASE_URL, echo=True)
SyncSessionLocal = sync_sessionmaker(bind=sync_engine, expire_on_commit=False)

Base = declarative_base()

# ✅ Add this:
async def get_db():
    async with SessionLocal() as session:
        yield session

def get_sync_db():
    """Get synchronous database session for Snowflake connector"""
    # Don't create tables - they should already exist from async engine initialization
    return SyncSessionLocal()
