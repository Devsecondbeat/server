# Second Beat - Basic MVP Timeline (Ads Feature Only)

## Executive Summary

This document outlines a focused timeline for deploying a minimal MVP of Second Beat with **only the ads/marketplace feature**. The primary goal is to establish a solid foundation for managing, deploying, and testing future features while delivering a functional ads marketplace.

**Target Deployment Timeline: 4-6 weeks**

---

## Milestone 1: Foundation & Development Infrastructure (Week 1)

### 1.1 Development Environment & Code Quality
**Duration:** 2-3 days

- [x] **Version Control Setup**
  - ✅ Git workflow (GitHub Flow) - CONTRIBUTING.md created
  - [ ] Branch protection rules for main/master (needs GitHub setup)
  - ✅ `.gitignore` properly configured
  - ✅ Contribution guidelines document (CONTRIBUTING.md)

- [x] **Code Quality Tools**
  - ✅ ESLint configuration (Airbnb style guide)
  - ✅ Prettier for code formatting
  - ✅ Pre-commit hooks (Husky + lint-staged) - fully operational
  - ✅ EditorConfig for consistent styles

- [x] **Environment Management**
  - ✅ Create `.env.example` with all required variables
  - [ ] Environment validation on application startup
  - [ ] Separate configs for dev/staging/production
  - ✅ Document all environment variables (in .env.example)

### 1.2 Database Foundation
**Duration:** 2-3 days

- [ ] **Database Migration System**
  - Set up migration tool (node-pg-migrate or Knex.js)
  - Create migration for existing schema
  - Version control for all database changes
  - Rollback capability

- [ ] **Database Schema Optimization**
  - Review and normalize existing tables
  - Add proper indexes for performance:
    - `used_instrument_ads`: user_id, make_id, created_at, price
    - `users`: email (unique), activation_token
  - Add audit columns (created_at, updated_at, deleted_at)
  - Implement soft delete pattern
  - Foreign key constraints

- [ ] **Connection Management**
  - Optimize PostgreSQL connection pool settings
  - Connection health checks
  - Connection retry logic
  - Pool monitoring

### 1.3 Project Architecture
**Duration:** 2 days

- [ ] **Refactor Project Structure**
  ```
  src/
  ├── config/          # Configuration files
  ├── controllers/     # Request handlers (thin layer)
  ├── services/        # Business logic layer
  ├── models/          # Data access layer
  ├── routes/          # API routes
  ├── middleware/      # Express middleware
  ├── utils/           # Helper functions
  ├── validators/      # Input validation schemas
  ├── errors/          # Custom error classes
  └── tests/           # Test files
  ```

- [ ] **Service Layer Implementation**
  - Extract business logic from controllers
  - Create service interfaces
  - Dependency injection pattern

- [ ] **Error Handling Foundation**
  - Centralized error handling middleware
  - Custom error classes (AppError, ValidationError, NotFoundError)
  - Consistent error response format
  - Error logging integration

---

## Milestone 2: Security & Authentication Foundation (Week 1-2)

### 2.1 Security Hardening
**Duration:** 3-4 days

- [~] **Security Middleware**
  - ✅ Enable and configure Helmet.js
  - ✅ CORS configuration (configurable via CORS_ORIGIN env var)
  - [ ] Rate limiting (express-rate-limit):
    - General API: 100 requests/15min per IP
    - Auth endpoints: 5 requests/15min per IP
  - [ ] Request size limits
  - ✅ XSS protection headers (via Helmet.js)

- [ ] **Input Validation**
  - Implement validation library (Joi recommended)
  - Create validation schemas for all endpoints:
    - User registration/login
    - Ad creation/update
    - Image upload
  - Sanitize all user inputs
  - File upload validation (type, size limits)

- [ ] **Authentication Improvements**
  - JWT token refresh mechanism
  - Token expiration strategy (access: 15min, refresh: 7 days)
  - Secure token storage guidelines
  - Account lockout after 5 failed login attempts (15min lockout)
  - Password strength requirements (min 8 chars, complexity)

- [ ] **Secrets Management**
  - All secrets in environment variables
  - No hardcoded secrets in code
  - Document secret rotation process

### 2.2 API Security
**Duration:** 1-2 days

- [ ] **Authentication Middleware**
  - Standardize Bearer token authentication
  - Improve token validation
  - Handle token expiration gracefully
  - Logout endpoint (optional: token blacklisting)

- [ ] **Authorization**
  - Resource ownership validation
  - Users can only modify their own ads
  - Prevent unauthorized data access

---

## Milestone 3: Core Ads Feature Enhancement (Week 2-3)

### 3.1 User Management (Minimal)
**Duration:** 2 days

- [ ] **User Profile**
  - GET user profile endpoint
  - PUT user profile endpoint (name, phone)
  - Basic profile validation

- [ ] **Email Functionality**
  - Email templates for activation/reset
  - Resend activation email endpoint
  - Email delivery error handling

### 3.2 Ads Feature - Core Functionality
**Duration:** 4-5 days

- [ ] **Ad CRUD Operations**
  - ✅ Create ad (already exists - enhance with validation)
  - ✅ Get all ads (enhance with pagination)
  - ✅ Get ads by user (enhance with validation)
  - ✅ Update ad (add ownership validation)
  - ✅ Delete ad (implement soft delete)

- [ ] **Ad Management**
  - Ad status (active, sold, expired, draft)
  - Mark ad as sold endpoint
  - Ad expiration dates (optional: auto-expire after 90 days)
  - Ownership validation on all update/delete operations

- [ ] **Image Management**
  - Multiple image upload per ad (up to 5 images)
  - Image compression before upload
  - Image deletion from S3
  - Image metadata storage in database
  - Presigned URLs for secure image access
  - Image validation (type, size, dimensions)

### 3.3 Search & Discovery
**Duration:** 3-4 days

- [ ] **Basic Search**
  - Search by instrument name
  - Search by description (full-text search)
  - Case-insensitive search

- [ ] **Filtering**
  - Filter by instrument make
  - Filter by price range (min/max)
  - Filter by condition
  - Filter by status (active only by default)

- [ ] **Sorting**
  - Sort by price (asc/desc)
  - Sort by date (newest/oldest)
  - Default: newest first

- [ ] **Pagination**
  - Limit and offset pagination
  - Default: 20 items per page
  - Return total count for pagination UI
  - Maximum 100 items per page

---

## Milestone 4: Testing Foundation (Week 3-4)

### 4.1 Testing Infrastructure
**Duration:** 3-4 days

- [ ] **Test Setup**
  - Jest configuration
  - Supertest for API testing
  - Test database setup
  - Test environment configuration
  - Test data fixtures/seeders

- [ ] **Unit Tests**
  - Test services (business logic)
  - Test utilities and helpers
  - Test validators
  - Test models (database operations)
  - Target: 60%+ code coverage

- [ ] **Integration Tests**
  - Test API endpoints:
    - User registration/login
    - Ad CRUD operations
    - Image upload
    - Search and filtering
  - Test authentication flows
  - Test error handling
  - Test database transactions

- [ ] **Test Utilities**
  - Mock external services (S3, SendGrid)
  - Test helpers for common operations
  - Test database cleanup

### 4.2 CI/CD Foundation
**Duration:** 2-3 days

- [ ] **Continuous Integration**
  - GitHub Actions workflow (or similar)
  - Run tests on every PR
  - Run linting on every PR
  - Run security audit (npm audit)
  - Block merge if tests fail

- [ ] **Pre-commit Hooks**
  - Run linting before commit
  - Run tests before commit (optional)
  - Format code before commit

---

## Milestone 5: Logging & Monitoring Foundation (Week 4)

### 5.1 Logging
**Duration:** 2 days

- [x] **Structured Logging**
  - ✅ Winston logger configuration (src/config/logger.js)
  - ✅ Log levels (error, warn, info, debug) - configurable via LOG_LEVEL env var
  - [ ] Request/response logging middleware
  - ✅ Error stack trace logging
  - ✅ Log format: JSON for production, readable for dev

- [x] **Log Management**
  - ✅ Log rotation (5MB max, 5 files)
  - [ ] Log retention policy (needs documentation)
  - ✅ Separate log files for errors (logs/error.log, logs/combined.log)

### 5.2 Monitoring & Health Checks
**Duration:** 2 days

- [x] **Health Check Endpoints**
  - ✅ `/health` - Basic health check (status, timestamp, uptime)
  - ✅ `/ready` - Readiness check (status, timestamp)
  - ✅ Return appropriate HTTP status codes (200)

- [ ] **Prometheus Metrics Integration**
  - Install `prom-client` package
  - Create metrics registry
  - Expose `/metrics` endpoint
  - Implement custom metrics:
    - HTTP request duration (histogram)
    - HTTP request count (counter)
    - Active connections (gauge)
    - Database query duration (histogram)
    - Error rate (counter)
  - Add middleware to collect request metrics automatically

- [ ] **Grafana Dashboard Setup**
  - Install and configure Prometheus server
  - Configure Prometheus to scrape application metrics
  - Install and configure Grafana
  - Connect Grafana to Prometheus data source
  - Create basic dashboards:
    - Application overview (request rate, error rate, latency)
    - Database performance (query duration, connection pool)
    - System resources (CPU, memory, disk)
    - API endpoint performance breakdown
  - Set up alerting rules in Prometheus
  - Configure Grafana alert notifications

- [ ] **Error Tracking**
  - Set up error tracking service (Sentry recommended)
  - Error alerting configuration
  - Error aggregation

---

## Milestone 6: Documentation & API Standards (Week 4-5)

### 6.1 API Documentation
**Duration:** 2-3 days

- [ ] **OpenAPI/Swagger Documentation**
  - Document all API endpoints
  - Request/response schemas
  - Authentication documentation
  - Error response documentation
  - Interactive API explorer

- [ ] **API Versioning**
  - Maintain `/api/v1/` structure
  - Document versioning strategy
  - Plan for future versions

### 6.2 Code Documentation
**Duration:** 1-2 days

- [ ] **Code Comments**
  - JSDoc for all public functions
  - Complex logic explanations
  - API endpoint documentation in code

- [~] **Setup Documentation**
  - [ ] Comprehensive README.md (basic exists, needs enhancement)
  - [ ] Local development setup guide
  - ✅ Environment variables documentation (.env.example created)
  - [ ] Database setup and migration guide
  - [ ] Testing guide
  - ✅ Contributing guide (CONTRIBUTING.md created)

---

## Milestone 7: Deployment Foundation (Week 5-6)

### 7.1 Containerization
**Duration:** 2 days

- [ ] **Docker Setup**
  - Create Dockerfile
  - Multi-stage build for optimization
  - Docker Compose for local development
  - `.dockerignore` configuration
  - Health check in Dockerfile

### 7.2 Deployment Infrastructure
**Duration:** 3-4 days

- [ ] **Cloud Platform Setup**
  - Choose hosting platform (AWS, Heroku, Railway, Render, etc.)
  - Production database setup (managed PostgreSQL)
  - S3 bucket configuration for production
  - Environment variable management
  - SSL/TLS certificates

- [ ] **Deployment Pipeline**
  - Staging environment setup
  - Automated deployment from main branch
  - Database migration automation
  - Health check after deployment
  - Rollback procedure documentation

- [ ] **Production Configuration**
  - Production logging setup
  - Error tracking in production
  - Monitoring dashboards
  - Basic alerting rules

### 7.3 Backup & Recovery
**Duration:** 1 day

- [ ] **Database Backups**
  - Automated daily backups
  - Backup retention (7 days minimum)
  - Test restore procedure
  - Document recovery process

---

## Milestone 8: Pre-Launch & Launch (Week 6)

### 8.1 Pre-Launch Testing
**Duration:** 2-3 days

- [ ] **Security Review**
  - Dependency vulnerability audit
  - OWASP Top 10 basic checklist
  - Security headers verification
  - API security review

- [ ] **Performance Testing**
  - Basic load testing (100 concurrent users)
  - Identify bottlenecks
  - Database query optimization
  - Response time targets (< 500ms p95)

- [ ] **End-to-End Testing**
  - Complete user flows:
    - Register → Activate → Login
    - Create ad → Upload images → View ad
    - Search → Filter → View results
    - Update ad → Delete ad
  - Edge case testing
  - Error scenario testing

### 8.2 Launch Checklist
**Duration:** 1-2 days

- [ ] **Pre-Launch**
  - [ ] All critical bugs fixed
  - [ ] All tests passing
  - [ ] Security audit passed
  - [ ] Documentation complete
  - [ ] Monitoring active
  - [ ] Backups configured
  - [ ] Environment variables set
  - [ ] Database migrations run

- [ ] **Launch Day**
  - [ ] Final deployment to production
  - [ ] Smoke tests pass
  - [ ] Monitor error rates
  - [ ] Monitor performance metrics
  - [ ] Verify all endpoints working

---

## Foundation for Future Features

### What This MVP Establishes

1. **Development Workflow**
   - ✅ Git workflow and branching strategy (CONTRIBUTING.md)
   - ✅ Code quality tools and standards (ESLint, Prettier)
   - ✅ Pre-commit hooks (Husky + lint-staged)
   - ✅ Code review process (documented in CONTRIBUTING.md)

2. **Testing Infrastructure**
   - Test framework setup
   - Test patterns and utilities
   - CI/CD integration
   - Coverage reporting

3. **Deployment Pipeline**
   - Automated deployment
   - Staging environment
   - Database migration automation
   - Rollback procedures

4. **Monitoring & Observability**
   - ✅ Logging infrastructure (Winston configured)
   - [ ] Error tracking (Sentry - pending)
   - ✅ Health checks (/health, /ready endpoints)
   - [ ] Basic metrics (Prometheus - pending)

5. **Security Foundation**
   - ✅ Authentication/authorization patterns (JWT implemented)
   - [ ] Input validation framework (Joi - pending)
   - ✅ Security middleware (Helmet.js enabled, CORS configured)
   - ✅ Secrets management (environment variables)

6. **Code Architecture**
   - Service layer pattern
   - Error handling patterns
   - Validation patterns
   - Database access patterns

### Adding Future Features

When adding new features (e.g., tutor module, messaging, payments):
1. Follow established project structure
2. Write tests using existing test infrastructure
3. Use existing validation patterns
4. Follow security patterns
5. Document in API docs
6. Deploy using existing CI/CD pipeline

---

## Technical Stack

### Core Stack
- **Runtime:** Node.js (LTS version)
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT
- **File Storage:** AWS S3
- **Email:** SendGrid

### Development Tools
- **Testing:** Jest, Supertest
- **Validation:** Joi
- **Logging:** Winston
- **Error Tracking:** Sentry
- **CI/CD:** GitHub Actions
- **Containerization:** Docker
- **API Docs:** Swagger/OpenAPI

### Monitoring Stack
- **Metrics Collection:** Prometheus
- **Metrics Visualization:** Grafana
- **Metrics Client:** prom-client

### Optional (Post-MVP)
- **Caching:** Redis
- **APM:** DataDog / New Relic / CloudWatch
- **Search:** Elasticsearch (for advanced search)

---

## Success Criteria

### MVP Launch Criteria
1. ✅ Users can register, activate account, and login
2. ✅ Users can create, read, update, and delete ads
3. ✅ Users can upload multiple images per ad
4. ✅ Users can search and filter ads
5. ✅ All endpoints have input validation
6. ✅ Security best practices implemented
7. ✅ 60%+ test coverage
8. ✅ API documentation complete
9. ✅ Automated deployment working
10. ✅ Monitoring and logging operational
11. ✅ Database backups automated

### Foundation Criteria
1. ✅ Project structure supports future features
2. ✅ Testing infrastructure ready for new features
3. ✅ CI/CD pipeline can deploy new features
4. ✅ Monitoring can track new features
5. ✅ Documentation process established

---

## Timeline Summary

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| **Week 1** | Foundation & Security | Dev environment, DB migrations, security hardening |
| **Week 2** | Core Ads Feature | Enhanced CRUD, images, search/filter |
| **Week 3** | Testing Foundation | Test infrastructure, unit/integration tests |
| **Week 4** | Logging & Documentation | Logging, monitoring, API docs |
| **Week 5** | Deployment Setup | Docker, cloud infrastructure, CI/CD |
| **Week 6** | Pre-Launch & Launch | Testing, security review, production launch |

**Total Duration: 6 weeks** (with 1 week buffer: 7 weeks)

---

## Risk Mitigation

### Technical Risks
1. **Database Performance**
   - Mitigation: Proper indexing, query optimization, connection pooling

2. **Third-party Service Failures**
   - Mitigation: Retry logic, error handling, monitoring

3. **Security Vulnerabilities**
   - Mitigation: Security audit, dependency updates, security headers

4. **Deployment Issues**
   - Mitigation: Staging environment, automated testing, rollback plan

### Timeline Risks
1. **Scope Creep**
   - Mitigation: Strict MVP definition, focus on ads only

2. **Infrastructure Delays**
   - Mitigation: Use managed services, start early

---

## Post-MVP: Adding New Features

### Example: Adding Tutor Module

1. **Week 1-2: Feature Development**
   - Follow existing project structure
   - Create tutor services, models, controllers
   - Use existing validation patterns
   - Write tests using existing test infrastructure

2. **Week 2: Integration**
   - Add routes following existing patterns
   - Update API documentation
   - Integration tests

3. **Week 3: Deployment**
   - Deploy using existing CI/CD pipeline
   - Monitor using existing monitoring
   - No new infrastructure needed

**Estimated Time: 2-3 weeks** (vs 4-5 weeks without foundation)

---

## Prometheus & Grafana Integration Guide

### How Easy Is It to Integrate?

**Integration Difficulty: ⭐⭐ Easy (1-2 days)**

Prometheus and Grafana integration is straightforward with Node.js/Express applications:

#### Step 1: Install Dependencies (5 minutes)
```bash
npm install prom-client
```

#### Step 2: Create Metrics Middleware (30 minutes)
- Use `prom-client` to create metrics registry
- Add HTTP request duration histogram
- Add HTTP request counter
- Create middleware to automatically collect metrics

#### Step 3: Expose Metrics Endpoint (10 minutes)
- Add `/metrics` route that returns Prometheus format
- Prometheus will scrape this endpoint

#### Step 4: Set Up Prometheus (1-2 hours)
- Install Prometheus (Docker recommended)
- Configure `prometheus.yml` to scrape your app
- Set scrape interval (default: 15s)

#### Step 5: Set Up Grafana (1-2 hours)
- Install Grafana (Docker recommended)
- Connect Grafana to Prometheus data source
- Import pre-built Node.js dashboard or create custom ones
- Configure alerts

**Total Time: 4-6 hours** (can be done in one day)

### Benefits

1. **Real-time Metrics**: Monitor request rates, latency, errors in real-time
2. **Historical Data**: Track performance trends over time
3. **Custom Dashboards**: Visualize exactly what you need
4. **Alerting**: Get notified when metrics exceed thresholds
5. **Cost-effective**: Open-source, no per-metric pricing
6. **Industry Standard**: Widely used, lots of community support

### Example Metrics to Track

- **HTTP Metrics:**
  - Request duration (p50, p95, p99)
  - Request count by endpoint
  - Error rate by status code
  - Active connections

- **Database Metrics:**
  - Query duration
  - Connection pool size
  - Active connections
  - Query errors

- **System Metrics:**
  - CPU usage
  - Memory usage
  - Disk I/O
  - Network traffic

### Quick Start Code Example

```javascript
// metrics.js
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const register = new Registry();

// HTTP request duration
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// HTTP request count
const httpRequestCount = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestCount);

export { register, httpRequestDuration, httpRequestCount };
```

```javascript
// middleware/metrics.js
import { httpRequestDuration, httpRequestCount } from '../metrics.js';

export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestCount
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
};
```

```javascript
// routes/metrics.js
import express from 'express';
import { register } from '../metrics.js';

const router = express.Router();

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  app:
    # Your app service
    ports:
      - "3000:3000"
  
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
```

### Resources

- **prom-client**: https://github.com/siimon/prom-client
- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/
- **Node.js Dashboard**: https://grafana.com/grafana/dashboards/11159

---

## Notes

- This timeline assumes 1-2 developers
- Focus on foundation quality over feature quantity
- Better to have a solid foundation with fewer features than many features on shaky ground
- All foundation work pays off when adding future features
- Regular code reviews recommended
- Weekly progress reviews
- **Prometheus & Grafana integration is straightforward and highly recommended for production monitoring**

---

**Document Version:** 1.2  
**Last Updated:** November 21, 2025  
**Owner:** Product Owner / Tech Lead

## Progress Update

### ✅ Completed Items (as of November 21, 2024)

**Milestone 1: Foundation & Development Infrastructure**
- ✅ Version Control Setup (CONTRIBUTING.md, Git workflow documented)
- ✅ Code Quality Tools (ESLint, Prettier, Husky, lint-staged)
- ✅ Environment Management (.env.example created with all variables)

**Milestone 2: Security & Authentication**
- ✅ Helmet.js enabled and configured
- ✅ CORS configuration implemented

**Milestone 5: Logging & Monitoring**
- ✅ Winston logging configured and integrated
- ✅ Health check endpoints (/health, /ready) implemented
- ✅ Log rotation and file management configured

### 📊 Current Progress Estimate
- **Milestone 1:** ~40% complete
- **Milestone 2:** ~30% complete
- **Milestone 5:** ~40% complete
- **Overall MVP:** ~25% complete

