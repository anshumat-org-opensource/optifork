# cache.py - Redis caching layer for OptiFork
import os
import json
import logging
from typing import Optional, Any, Dict, List
from datetime import datetime, timedelta
import redis.asyncio as redis
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

class CacheManager:
    """Redis-based caching manager for OptiFork"""
    
    def __init__(self):
        self.redis_client: Optional[Redis] = None
        self.enabled = os.getenv("REDIS_ENABLED", "true").lower() == "true"
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        
        # Cache TTL settings (in seconds)
        self.ttl_settings = {
            "feature_flags": 300,      # 5 minutes
            "experiments": 300,        # 5 minutes  
            "user_permissions": 900,   # 15 minutes
            "flag_evaluation": 60,     # 1 minute (for consistent evaluation)
            "export_status": 30,       # 30 seconds
        }
    
    async def connect(self) -> bool:
        """Initialize Redis connection"""
        if not self.enabled:
            logger.info("Redis caching is disabled")
            return False
            
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # Test connection
            await self.redis_client.ping()
            logger.info(f"✅ Redis connected successfully: {self.redis_url}")
            return True
            
        except Exception as e:
            logger.warning(f"❌ Redis connection failed: {e}. Caching disabled.")
            self.redis_client = None
            self.enabled = False
            return False
    
    async def disconnect(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis connection closed")
    
    def _get_key(self, category: str, identifier: str) -> str:
        """Generate cache key with namespace"""
        return f"optifork:{category}:{identifier}"
    
    async def get(self, category: str, identifier: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.enabled or not self.redis_client:
            return None
            
        try:
            key = self._get_key(category, identifier)
            value = await self.redis_client.get(key)
            
            if value is not None:
                logger.debug(f"Cache HIT: {key}")
                return json.loads(value)
            else:
                logger.debug(f"Cache MISS: {key}")
                return None
                
        except Exception as e:
            logger.error(f"Cache GET error for {category}:{identifier}: {e}")
            return None
    
    async def set(self, category: str, identifier: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with TTL"""
        if not self.enabled or not self.redis_client:
            return False
            
        try:
            key = self._get_key(category, identifier)
            ttl = ttl or self.ttl_settings.get(category, 300)
            
            # Serialize value to JSON
            serialized_value = json.dumps(value, default=str)
            
            await self.redis_client.setex(key, ttl, serialized_value)
            logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")
            return True
            
        except Exception as e:
            logger.error(f"Cache SET error for {category}:{identifier}: {e}")
            return False
    
    async def delete(self, category: str, identifier: str) -> bool:
        """Delete value from cache"""
        if not self.enabled or not self.redis_client:
            return False
            
        try:
            key = self._get_key(category, identifier)
            result = await self.redis_client.delete(key)
            logger.debug(f"Cache DELETE: {key}")
            return result > 0
            
        except Exception as e:
            logger.error(f"Cache DELETE error for {category}:{identifier}: {e}")
            return False
    
    async def delete_pattern(self, category: str, pattern: str = "*") -> int:
        """Delete multiple keys matching pattern"""
        if not self.enabled or not self.redis_client:
            return 0
            
        try:
            key_pattern = self._get_key(category, pattern)
            keys = []
            
            # Scan for matching keys (more efficient than KEYS *)
            async for key in self.redis_client.scan_iter(match=key_pattern, count=100):
                keys.append(key)
            
            if keys:
                deleted = await self.redis_client.delete(*keys)
                logger.debug(f"Cache DELETE_PATTERN: {key_pattern} ({deleted} keys)")
                return deleted
            
            return 0
            
        except Exception as e:
            logger.error(f"Cache DELETE_PATTERN error for {category}:{pattern}: {e}")
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.enabled or not self.redis_client:
            return {"enabled": False, "status": "disabled"}
            
        try:
            info = await self.redis_client.info()
            
            # Get OptiFork-specific key count
            optifork_keys = 0
            async for key in self.redis_client.scan_iter(match="optifork:*", count=100):
                optifork_keys += 1
            
            return {
                "enabled": True,
                "status": "connected",
                "redis_version": info.get("redis_version"),
                "memory_usage": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "total_keys": info.get("db0", {}).get("keys", 0),
                "optifork_keys": optifork_keys,
                "hit_rate": "N/A",  # Would need to track this separately
            }
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"enabled": True, "status": "error", "error": str(e)}

# Global cache manager instance
cache_manager = CacheManager()

# Convenience functions for specific cache categories
async def cache_feature_flag(flag_name: str, flag_data: Dict[str, Any]) -> bool:
    """Cache feature flag data"""
    return await cache_manager.set("feature_flags", flag_name, flag_data)

async def get_cached_feature_flag(flag_name: str) -> Optional[Dict[str, Any]]:
    """Get cached feature flag data"""
    return await cache_manager.get("feature_flags", flag_name)

async def invalidate_feature_flag(flag_name: str) -> bool:
    """Invalidate cached feature flag"""
    return await cache_manager.delete("feature_flags", flag_name)

async def cache_experiment(experiment_name: str, experiment_data: Dict[str, Any]) -> bool:
    """Cache experiment data"""
    return await cache_manager.set("experiments", experiment_name, experiment_data)

async def get_cached_experiment(experiment_name: str) -> Optional[Dict[str, Any]]:
    """Get cached experiment data"""
    return await cache_manager.get("experiments", experiment_name)

async def invalidate_experiment(experiment_name: str) -> bool:
    """Invalidate cached experiment"""
    return await cache_manager.delete("experiments", experiment_name)

async def cache_user_permissions(user_id: str, permissions: Dict[str, Any]) -> bool:
    """Cache user permissions"""
    return await cache_manager.set("user_permissions", user_id, permissions)

async def get_cached_user_permissions(user_id: str) -> Optional[Dict[str, Any]]:
    """Get cached user permissions"""
    return await cache_manager.get("user_permissions", user_id)

async def invalidate_user_permissions(user_id: str) -> bool:
    """Invalidate cached user permissions"""
    return await cache_manager.delete("user_permissions", user_id)

# Cache warm-up functions
async def warm_up_cache():
    """Pre-load frequently accessed data into cache"""
    if not cache_manager.enabled:
        return
        
    try:
        # Import here to avoid circular imports
        from models import FeatureFlag, Experiment
        from db import SessionLocal
        
        async with SessionLocal() as session:
            # Cache all feature flags
            flags = await session.execute("SELECT * FROM feature_flags")
            for flag in flags.fetchall():
                await cache_feature_flag(flag.name, {
                    "id": flag.id,
                    "name": flag.name,
                    "description": flag.description,
                    "rollout": flag.rollout,
                    "rules": json.loads(flag.rules) if flag.rules else [],
                    "updated_at": flag.updated_at.isoformat() if flag.updated_at else None
                })
            
            # Cache all experiments
            experiments = await session.execute("SELECT * FROM experiments")
            for exp in experiments.fetchall():
                await cache_experiment(exp.name, {
                    "id": exp.id,
                    "name": exp.name,
                    "description": exp.description,
                    "variants": json.loads(exp.variants) if exp.variants else [],
                    "updated_at": exp.updated_at.isoformat() if exp.updated_at else None
                })
        
        logger.info("Cache warm-up completed successfully")
        
    except Exception as e:
        logger.error(f"Cache warm-up failed: {e}")

# Initialize cache on module import
async def init_cache():
    """Initialize cache connection"""
    await cache_manager.connect()