# Security Policy =

OptiFork takes security seriously. We appreciate the security community's efforts to responsibly disclose vulnerabilities and work with us to improve the security of our platform.

## =á Supported Versions

We provide security updates for the following versions of OptiFork:

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| 1.x.x   |  Currently supported | Latest stable release |
| 0.9.x   |   Limited support | Critical security fixes only |
| < 0.9   | L Not supported | Please upgrade to latest version |

## =¨ Reporting a Vulnerability

If you discover a security vulnerability in OptiFork, please follow responsible disclosure practices:

### Preferred Method: Private Security Advisory

1. **Navigate** to the [Security tab](../../security) in our GitHub repository
2. **Click** "Report a vulnerability"
3. **Fill out** the security advisory form with:
   - Detailed description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact and severity assessment
   - Suggested fix (if you have one)

### Alternative: Email

Send an email to **security@optifork.com** with:

- **Subject**: `[SECURITY] Brief description of the issue`
- **Content**: Detailed vulnerability report (see template below)
- **Attachments**: Screenshots, proof-of-concept code, or logs (if applicable)

### Email Template

```
Subject: [SECURITY] SQL Injection in Flag Creation Endpoint

Vulnerability Type: SQL Injection
Severity: High
Affected Component: Backend API - /flags endpoint
Affected Versions: 1.0.0 - 1.2.1

Description:
The flag creation endpoint is vulnerable to SQL injection through the 'name' parameter. An attacker can execute arbitrary SQL commands by crafting malicious input.

Steps to Reproduce:
1. Send POST request to /flags
2. Include malicious SQL in the 'name' field: {"name": "test'; DROP TABLE flags; --"}
3. Observe that the SQL command is executed

Impact:
- Complete database compromise
- Data exfiltration
- Service disruption

Proof of Concept:
[Include code, screenshots, or detailed steps]

Suggested Fix:
Use parameterized queries in the flag creation function instead of string concatenation.

Contact Information:
- Name: [Your Name]
- Email: [Your Email]
- Preferred communication method: Email
```

## = Security Best Practices

### For Users

#### Production Deployment

1. **Environment Variables**
   ```bash
   # Use strong, unique secret keys
   SECRET_KEY=your-256-bit-secret-key-here
   
   # Enable security features
   RATE_LIMIT_ENABLED=true
   IP_FILTERING_ENABLED=true
   
   # Configure trusted hosts
   TRUSTED_HOSTS=yourdomain.com,api.yourdomain.com
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

2. **Database Security**
   ```bash
   # Use strong database credentials
   POSTGRES_USER=optifork_user
   POSTGRES_PASSWORD=strong-random-password-here
   POSTGRES_DB=optifork_prod
   
   # Enable SSL/TLS for database connections
   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
   ```

3. **Redis Security**
   ```bash
   # Set Redis password
   REDIS_PASSWORD=strong-redis-password
   REDIS_URL=redis://:strong-redis-password@redis:6379/0
   ```

4. **Network Security**
   ```bash
   # Configure firewall rules
   # Only allow necessary ports: 80 (HTTP), 443 (HTTPS), 22 (SSH)
   
   # Use reverse proxy (nginx/traefik) for HTTPS termination
   # Configure proper CORS headers
   # Enable security headers middleware
   ```

#### Docker Security

1. **Use Official Images**
   ```dockerfile
   # Use specific versions, not 'latest'
   FROM python:3.11-slim-bullseye
   FROM node:18-alpine
   FROM postgres:15-alpine
   FROM redis:7-alpine
   ```

2. **Non-Root Users**
   ```dockerfile
   # Create and use non-root user
   RUN adduser --disabled-password --gecos '' appuser
   USER appuser
   ```

3. **Resource Limits**
   ```yaml
   # docker-compose.yml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '2.0'
             memory: 2G
   ```

#### Authentication & Authorization

1. **API Keys**
   - Generate unique API keys for different clients
   - Rotate keys regularly
   - Store keys securely (environment variables, not code)
   - Implement key-based rate limiting

2. **User Management**
   - Enforce strong password policies
   - Implement account lockout after failed attempts
   - Use secure session management
   - Enable two-factor authentication (when available)

### For Developers

#### Secure Coding Practices

1. **Input Validation**
   ```python
   from pydantic import BaseModel, validator
   
   class FeatureFlagIn(BaseModel):
       name: str
       rollout: float
       
       @validator('name')
       def validate_name(cls, v):
           if not v or len(v) > 100:
               raise ValueError('Name must be 1-100 characters')
           if not v.replace('_', '').replace('-', '').isalnum():
               raise ValueError('Name contains invalid characters')
           return v
       
       @validator('rollout')
       def validate_rollout(cls, v):
           if not 0.0 <= v <= 1.0:
               raise ValueError('Rollout must be between 0 and 1')
           return v
   ```

2. **SQL Injection Prevention**
   ```python
   #  Good: Use parameterized queries
   async def get_flag_by_name(db: AsyncSession, name: str):
       result = await db.execute(
           text("SELECT * FROM feature_flags WHERE name = :name"),
           {"name": name}
       )
       return result.fetchone()
   
   # L Bad: String concatenation
   query = f"SELECT * FROM feature_flags WHERE name = '{name}'"
   ```

3. **Authentication**
   ```python
   from fastapi import Depends, HTTPException, status
   from fastapi.security import HTTPBearer
   
   security = HTTPBearer()
   
   async def verify_token(token: str = Depends(security)):
       try:
           # Verify JWT token
           payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=["HS256"])
           return payload
       except JWTError:
           raise HTTPException(
               status_code=status.HTTP_401_UNAUTHORIZED,
               detail="Invalid authentication credentials"
           )
   ```

4. **Rate Limiting**
   ```python
   from slowapi import Limiter
   
   limiter = Limiter(key_func=get_remote_address)
   
   @app.post("/flags")
   @limiter.limit("10/minute")
   async def create_flag(request: Request, flag: FeatureFlagIn):
       # Implementation
   ```

#### Dependency Security

1. **Keep Dependencies Updated**
   ```bash
   # Check for vulnerable dependencies
   pip audit
   npm audit
   
   # Update dependencies regularly
   pip install -U -r requirements.txt
   npm update
   ```

2. **Use Dependency Scanning**
   ```yaml
   # .github/workflows/security.yml
   name: Security Scan
   on: [push, pull_request]
   jobs:
     dependency-check:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Run Snyk
           uses: snyk/actions/python@master
   ```

## = Security Features

### Built-in Security Measures

1. **Rate Limiting**
   - Configurable per-endpoint rate limits
   - Redis-based distributed rate limiting
   - IP-based and user-based limiting

2. **Security Headers**
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block
   - Strict-Transport-Security (HTTPS)
   - Content Security Policy

3. **Input Validation**
   - Pydantic models for request validation
   - SQL injection prevention
   - XSS protection through output encoding

4. **Authentication & Authorization**
   - JWT token-based authentication
   - Role-based access control (RBAC)
   - API key authentication for integrations

5. **Monitoring & Logging**
   - Request/response logging
   - Security event logging
   - Failed authentication tracking
   - Prometheus metrics for security events

### Optional Security Enhancements

1. **IP Filtering**
   ```bash
   # Whitelist specific IPs
   ALLOWED_IPS=192.168.1.0/24,10.0.0.0/8
   
   # Blacklist malicious IPs
   BLOCKED_IPS=1.2.3.4,5.6.7.8
   IP_FILTERING_ENABLED=true
   ```

2. **SSL/TLS Configuration**
   ```nginx
   # nginx.conf
   ssl_protocols TLSv1.2 TLSv1.3;
   ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
   ssl_prefer_server_ciphers off;
   add_header Strict-Transport-Security "max-age=63072000" always;
   ```

## =¨ Response Process

### Our Commitment

When you report a security vulnerability:

1. **Acknowledgment**: We'll acknowledge receipt within **24 hours**
2. **Initial Assessment**: We'll provide an initial assessment within **72 hours**
3. **Regular Updates**: We'll send progress updates every **7 days**
4. **Resolution Timeline**: We aim to resolve critical issues within **30 days**

### Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| =4 Critical | Remote code execution, data breach | 24-48 hours | SQL injection, authentication bypass |
| =à High | Significant security impact | 3-7 days | XSS, privilege escalation |
| =á Medium | Moderate security risk | 1-2 weeks | Information disclosure, CSRF |
| =â Low | Minor security concern | 2-4 weeks | Security headers, rate limiting |

### Disclosure Timeline

1. **Day 0**: Vulnerability reported
2. **Day 1-3**: Initial triage and verification
3. **Day 7-30**: Develop and test fix
4. **Day 30-45**: Deploy fix and notify users
5. **Day 60-90**: Public disclosure (coordinated)

### Recognition

We believe in recognizing security researchers who help improve our platform:

- **Hall of Fame**: Public recognition on our security page
- **Coordinated Disclosure**: Work with you on public disclosure timing
- **Swag**: OptiFork branded merchandise for significant findings
- **Bug Bounty**: We're working on establishing a formal bug bounty program

## =à Security Tools & Testing

### Automated Security Testing

We use the following tools in our CI/CD pipeline:

- **SAST**: Static Application Security Testing with CodeQL
- **Dependency Scanning**: Snyk for vulnerable dependency detection
- **Container Scanning**: Docker image security scanning
- **Secrets Detection**: GitLeaks for exposed credentials

### Security Testing Commands

```bash
# Run security tests locally
cd backend

# Check for vulnerable dependencies
pip audit

# Static security analysis
bandit -r .

# Check for secrets in code
git-secrets --scan

# Container security scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    -v $(pwd):/root/.cache/ aquasec/trivy image optifork:latest
```

## =Þ Contact Information

### Security Team

- **Primary**: security@optifork.com
- **PGP Key**: [Download PGP Key](./security-pgp-key.asc) (coming soon)
- **Response Hours**: Monday-Friday, 9 AM - 5 PM UTC

### Emergency Contact

For critical vulnerabilities that pose immediate risk:

- **Signal**: +1-XXX-XXX-XXXX (coming soon)
- **Encrypted Email**: Use our PGP key for sensitive communications

## =O Thank You

We're grateful for the security community's efforts to keep OptiFork secure. Your responsible disclosure helps protect all OptiFork users and contributes to a safer open-source ecosystem.

### Previous Security Contributors

*This section will recognize individuals who have responsibly disclosed vulnerabilities.*

---

**Last Updated**: December 2023
**Next Review**: March 2024

For questions about this security policy, please contact security@optifork.com.