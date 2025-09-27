# middleware.py - Security and rate limiting middleware for OptiFork
import os
import time
import logging
from typing import Dict, Optional, Callable
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import redis.asyncio as redis
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

logger = logging.getLogger(__name__)

# Rate limiter configuration
def get_redis_limiter():
    """Get Redis-based rate limiter"""
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    try:
        return Limiter(
            key_func=get_remote_address,
            storage_uri=redis_url,
            default_limits=["100/minute"]  # Default rate limit
        )
    except Exception as e:
        logger.warning(f"Redis limiter failed, using memory limiter: {e}")
        return Limiter(
            key_func=get_remote_address,
            default_limits=["100/minute"]
        )

limiter = get_redis_limiter()

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # HSTS for HTTPS
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests for monitoring and debugging"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Log request
        logger.info(f"📥 {request.method} {request.url.path} - {get_remote_address(request)}")
        
        # Process request
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log response
            logger.info(
                f"📤 {request.method} {request.url.path} - "
                f"Status: {response.status_code} - "
                f"Time: {process_time:.3f}s"
            )
            
            # Add timing header
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(f"❌ {request.method} {request.url.path} - Error: {str(e)} - Time: {process_time:.3f}s")
            raise

class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """IP whitelist/blacklist middleware for production security"""
    
    def __init__(self, app, allowed_ips: Optional[list] = None, blocked_ips: Optional[list] = None):
        super().__init__(app)
        self.allowed_ips = set(allowed_ips or [])
        self.blocked_ips = set(blocked_ips or [])
        self.enabled = os.getenv("IP_FILTERING_ENABLED", "false").lower() == "true"
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not self.enabled:
            return await call_next(request)
            
        client_ip = get_remote_address(request)
        
        # Check blocked IPs first
        if client_ip in self.blocked_ips:
            logger.warning(f"🚫 Blocked IP attempted access: {client_ip}")
            return JSONResponse(
                status_code=403,
                content={"error": "Access denied"}
            )
        
        # Check allowed IPs (if whitelist is configured)
        if self.allowed_ips and client_ip not in self.allowed_ips:
            logger.warning(f"🚫 Non-whitelisted IP attempted access: {client_ip}")
            return JSONResponse(
                status_code=403,
                content={"error": "Access denied"}
            )
        
        return await call_next(request)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Custom rate limiting with different limits per endpoint"""
    
    def __init__(self, app):
        super().__init__(app)
        self.enabled = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
        
        # Different rate limits for different endpoints
        self.endpoint_limits = {
            "/flags": "50/minute",          # Flag evaluation
            "/experiments": "30/minute",    # Experiment assignment
            "/login": "5/minute",          # Login attempts
            "/users": "10/minute",         # User management
            "/integrations": "20/minute",  # Snowflake integration
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not self.enabled:
            return await call_next(request)
        
        # Apply specific limits based on endpoint
        path = request.url.path
        for endpoint, limit in self.endpoint_limits.items():
            if path.startswith(endpoint):
                # This would integrate with slowapi's limiter
                # For now, we'll let slowapi handle the actual limiting
                break
        
        return await call_next(request)

def setup_security_middleware(app: FastAPI):
    """Setup all security middleware for the FastAPI app"""
    
    # Environment configuration
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
    allowed_origins = [origin.strip() for origin in allowed_origins if origin.strip()]
    
    if not allowed_origins:
        allowed_origins = ["*"]  # Allow all in development
        logger.warning("⚠️ CORS allowing all origins - not recommended for production")
    
    # 1. Trusted Host Middleware (protect against Host header attacks)
    trusted_hosts = os.getenv("TRUSTED_HOSTS", "").split(",")
    trusted_hosts = [host.strip() for host in trusted_hosts if host.strip()]
    
    if trusted_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)
    
    # 2. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
        expose_headers=["X-Process-Time"]
    )
    
    # 3. Rate Limiting Middleware (SlowAPI)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    
    # 4. Custom Security Middleware
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    
    # 5. IP Filtering (if enabled)
    blocked_ips = os.getenv("BLOCKED_IPS", "").split(",")
    blocked_ips = [ip.strip() for ip in blocked_ips if ip.strip()]
    
    allowed_ips = os.getenv("ALLOWED_IPS", "").split(",")
    allowed_ips = [ip.strip() for ip in allowed_ips if ip.strip()]
    
    if blocked_ips or allowed_ips:
        app.add_middleware(IPWhitelistMiddleware, 
                          allowed_ips=allowed_ips if allowed_ips else None,
                          blocked_ips=blocked_ips if blocked_ips else None)
    
    logger.info("✅ Security middleware configured successfully")

# Authentication utilities
class AuthManager:
    """Simple authentication manager"""
    
    def __init__(self):
        self.secret_key = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
        if self.secret_key == "your-secret-key-change-in-production":
            logger.warning("⚠️ Using default SECRET_KEY - change this in production!")
    
    def validate_request(self, request: Request) -> bool:
        """Validate request authentication (placeholder for JWT implementation)"""
        # For now, we'll implement basic validation
        # In production, implement proper JWT validation
        
        # Skip auth for health checks and public endpoints
        public_endpoints = ["/health", "/metrics", "/docs", "/openapi.json"]
        if request.url.path in public_endpoints:
            return True
        
        # For now, allow all requests (implement JWT later)
        return True
    
    def get_current_user(self, request: Request) -> Optional[Dict]:
        """Get current user from request (placeholder)"""
        # This would extract user from JWT token
        # For now, return None (implement JWT later)
        return None

auth_manager = AuthManager()

# Rate limiting decorators for specific endpoints
def rate_limit(limit: str):
    """Decorator for endpoint-specific rate limiting"""
    return limiter.limit(limit)

# Security middleware exports
__all__ = [
    "setup_security_middleware",
    "limiter", 
    "rate_limit",
    "auth_manager",
    "SecurityHeadersMiddleware",
    "RequestLoggingMiddleware",
    "IPWhitelistMiddleware",
    "RateLimitMiddleware"
]