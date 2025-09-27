# monitoring.py - Health checks and monitoring for OptiFork
import os
import asyncio
import psutil
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response
import logging

from db import get_db, engine, sync_engine, get_database_info
from cache import cache_manager

logger = logging.getLogger(__name__)

# Prometheus metrics
flag_evaluations = Counter('optifork_flag_evaluations_total', 'Total flag evaluations', ['flag_name', 'enabled'])
request_duration = Histogram('optifork_request_duration_seconds', 'Request duration', ['method', 'endpoint'])
active_flags = Gauge('optifork_active_flags', 'Number of active feature flags')
active_experiments = Gauge('optifork_active_experiments', 'Number of active experiments')
database_connections = Gauge('optifork_database_connections', 'Number of database connections')
cache_hits = Counter('optifork_cache_hits_total', 'Cache hits', ['category'])
cache_misses = Counter('optifork_cache_misses_total', 'Cache misses', ['category'])

router = APIRouter(prefix="/health", tags=["monitoring"])

class HealthChecker:
    """Comprehensive health check system"""
    
    def __init__(self):
        self.start_time = datetime.utcnow()
    
    async def check_database(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            start_time = datetime.utcnow()
            
            # Test async database connection
            async with engine.begin() as conn:
                result = await conn.execute("SELECT 1")
                await result.fetchone()
            
            # Test sync database connection (for Snowflake connector)
            with sync_engine.connect() as conn:
                conn.execute("SELECT 1")
            
            response_time = (datetime.utcnow() - start_time).total_seconds()
            
            db_info = get_database_info()
            
            return {
                "status": "healthy",
                "type": db_info["type"],
                "response_time_ms": round(response_time * 1000, 2),
                "async_connection": "ok",
                "sync_connection": "ok"
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time_ms": None
            }
    
    async def check_cache(self) -> Dict[str, Any]:
        """Check Redis cache connectivity and performance"""
        if not cache_manager.enabled:
            return {
                "status": "disabled",
                "message": "Redis caching is disabled"
            }
        
        try:
            start_time = datetime.utcnow()
            
            # Test cache connection with ping
            if cache_manager.redis_client:
                await cache_manager.redis_client.ping()
                
                # Test cache operations
                test_key = "health_check_test"
                test_value = {"timestamp": datetime.utcnow().isoformat()}
                
                await cache_manager.set("health_check", test_key, test_value, ttl=10)
                retrieved = await cache_manager.get("health_check", test_key)
                await cache_manager.delete("health_check", test_key)
                
                if retrieved != test_value:
                    raise Exception("Cache read/write test failed")
            
            response_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Get cache stats
            stats = await cache_manager.get_stats()
            
            return {
                "status": "healthy",
                "response_time_ms": round(response_time * 1000, 2),
                "stats": stats
            }
            
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time_ms": None
            }
    
    async def check_system_resources(self) -> Dict[str, Any]:
        """Check system resource usage"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            
            # Process info
            process = psutil.Process()
            process_memory = process.memory_info()
            
            return {
                "status": "healthy",
                "cpu_percent": cpu_percent,
                "memory": {
                    "total_gb": round(memory.total / (1024**3), 2),
                    "available_gb": round(memory.available / (1024**3), 2),
                    "used_percent": memory.percent
                },
                "disk": {
                    "total_gb": round(disk.total / (1024**3), 2),
                    "free_gb": round(disk.free / (1024**3), 2),
                    "used_percent": round((disk.used / disk.total) * 100, 2)
                },
                "process": {
                    "memory_mb": round(process_memory.rss / (1024**2), 2),
                    "cpu_percent": process.cpu_percent()
                }
            }
            
        except Exception as e:
            logger.error(f"System resource check failed: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def check_application_metrics(self, db: AsyncSession) -> Dict[str, Any]:
        """Check application-specific metrics"""
        try:
            # Count feature flags
            flags_result = await db.execute("SELECT COUNT(*) FROM feature_flags")
            flags_count = flags_result.scalar()
            
            # Count experiments
            experiments_result = await db.execute("SELECT COUNT(*) FROM experiments")
            experiments_count = experiments_result.scalar()
            
            # Count recent exposures (last 24 hours)
            recent_exposures_result = await db.execute("""
                SELECT COUNT(*) FROM flag_exposures 
                WHERE timestamp > datetime('now', '-1 day')
            """)
            recent_exposures = recent_exposures_result.scalar()
            
            # Count users
            users_result = await db.execute("SELECT COUNT(*) FROM users")
            users_count = users_result.scalar()
            
            # Update Prometheus metrics
            active_flags.set(flags_count)
            active_experiments.set(experiments_count)
            
            return {
                "status": "healthy",
                "metrics": {
                    "feature_flags": flags_count,
                    "experiments": experiments_count,
                    "users": users_count,
                    "recent_exposures_24h": recent_exposures
                }
            }
            
        except Exception as e:
            logger.error(f"Application metrics check failed: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def get_uptime(self) -> Dict[str, Any]:
        """Get application uptime"""
        uptime_seconds = (datetime.utcnow() - self.start_time).total_seconds()
        
        return {
            "started_at": self.start_time.isoformat(),
            "uptime_seconds": round(uptime_seconds, 2),
            "uptime_human": str(timedelta(seconds=int(uptime_seconds)))
        }

# Global health checker instance
health_checker = HealthChecker()

@router.get("/")
@router.get("/live")
async def liveness_check():
    """Kubernetes liveness probe - basic health check"""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "optifork-backend"
    }

@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Kubernetes readiness probe - comprehensive health check"""
    checks = {}
    overall_status = "healthy"
    
    # Database check
    checks["database"] = await health_checker.check_database()
    if checks["database"]["status"] != "healthy":
        overall_status = "unhealthy"
    
    # Cache check
    checks["cache"] = await health_checker.check_cache()
    
    # Application metrics check
    checks["application"] = await health_checker.check_application_metrics(db)
    if checks["application"]["status"] != "healthy":
        overall_status = "unhealthy"
    
    response_data = {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks
    }
    
    status_code = 200 if overall_status == "healthy" else 503
    
    if status_code != 200:
        logger.warning(f"Readiness check failed: {response_data}")
    
    return Response(
        content=response_data,
        status_code=status_code,
        media_type="application/json"
    )

@router.get("/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    """Comprehensive health check with all metrics"""
    checks = {}
    
    # Run all health checks
    checks["database"] = await health_checker.check_database()
    checks["cache"] = await health_checker.check_cache()
    checks["system"] = await health_checker.check_system_resources()
    checks["application"] = await health_checker.check_application_metrics(db)
    checks["uptime"] = health_checker.get_uptime()
    
    # Determine overall status
    overall_status = "healthy"
    for check_name, check_result in checks.items():
        if check_result.get("status") in ["unhealthy", "error"]:
            overall_status = "unhealthy"
            break
    
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "version": os.getenv("APP_VERSION", "development"),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "checks": checks
    }

@router.get("/metrics")
async def prometheus_metrics():
    """Prometheus metrics endpoint"""
    # Update system metrics
    cpu_percent = psutil.cpu_percent()
    memory = psutil.virtual_memory()
    
    system_cpu = Gauge('optifork_system_cpu_percent', 'System CPU usage percentage')
    system_memory = Gauge('optifork_system_memory_percent', 'System memory usage percentage')
    
    system_cpu.set(cpu_percent)
    system_memory.set(memory.percent)
    
    # Generate metrics response
    metrics_data = generate_latest()
    
    return Response(
        content=metrics_data,
        media_type=CONTENT_TYPE_LATEST
    )

@router.get("/stats")
async def application_stats(db: AsyncSession = Depends(get_db)):
    """Application statistics and performance metrics"""
    try:
        # Database statistics
        db_stats = {}
        
        # Feature flags stats
        flags_result = await db.execute("""
            SELECT 
                COUNT(*) as total,
                AVG(rollout) as avg_rollout,
                COUNT(CASE WHEN rollout > 0 THEN 1 END) as active_flags
            FROM feature_flags
        """)
        flags_stats = flags_result.fetchone()
        
        # Experiments stats
        experiments_result = await db.execute("SELECT COUNT(*) FROM experiments")
        experiments_count = experiments_result.scalar()
        
        # Exposures stats (last 24 hours)
        exposures_result = await db.execute("""
            SELECT 
                COUNT(*) as total_exposures,
                COUNT(CASE WHEN enabled = true THEN 1 END) as enabled_exposures,
                COUNT(DISTINCT flag_name) as unique_flags_accessed,
                COUNT(DISTINCT user_id) as unique_users
            FROM flag_exposures 
            WHERE timestamp > datetime('now', '-1 day')
        """)
        exposures_stats = exposures_result.fetchone()
        
        # Cache statistics
        cache_stats = await cache_manager.get_stats()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "feature_flags": {
                "total": flags_stats[0] if flags_stats else 0,
                "active": flags_stats[2] if flags_stats else 0,
                "average_rollout": round(flags_stats[1] or 0, 3)
            },
            "experiments": {
                "total": experiments_count
            },
            "exposures_24h": {
                "total": exposures_stats[0] if exposures_stats else 0,
                "enabled": exposures_stats[1] if exposures_stats else 0,
                "unique_flags": exposures_stats[2] if exposures_stats else 0,
                "unique_users": exposures_stats[3] if exposures_stats else 0
            },
            "cache": cache_stats,
            "uptime": health_checker.get_uptime()
        }
        
    except Exception as e:
        logger.error(f"Error getting application stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving stats: {str(e)}")

# Monitoring utility functions
def record_flag_evaluation(flag_name: str, enabled: bool):
    """Record flag evaluation metric"""
    flag_evaluations.labels(flag_name=flag_name, enabled=str(enabled).lower()).inc()

def record_cache_hit(category: str):
    """Record cache hit metric"""
    cache_hits.labels(category=category).inc()

def record_cache_miss(category: str):
    """Record cache miss metric"""
    cache_misses.labels(category=category).inc()

# Export monitoring components
__all__ = [
    "router",
    "health_checker", 
    "record_flag_evaluation",
    "record_cache_hit",
    "record_cache_miss"
]