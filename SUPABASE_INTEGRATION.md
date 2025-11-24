# Supabase Database Integration with PostgreSQL Fallback

## Overview

This document describes the implementation of Supabase database integration with automatic fallback to self-hosted PostgreSQL. The system provides high availability by automatically switching between databases when one becomes unavailable.

## Architecture

### Connection Manager
- **Centralized Connection Pool:** Single connection pool shared across all models
- **Automatic Failover:** Seamless switching between Supabase and PostgreSQL
- **Health Monitoring:** Periodic health checks to ensure connection availability
- **Retry Logic:** Exponential backoff retry mechanism for connection attempts

### Database Priority
1. **Primary:** Supabase (if DB_PREFERRED_SOURCE is 'supabase')
2. **Fallback:** Self-hosted PostgreSQL
3. **Automatic Switch:** When primary fails, automatically attempts fallback

## Environment Variables

### Supabase Configuration
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_DB_HOST=db.your-project-id.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_supabase_db_password
SUPABASE_DB_SSL_MODE=require
```

### Self-Hosted PostgreSQL Configuration
```
DBHOST=your_db_host
DBPORT=5432
DBUSERNAME=your_db_username
DATABASENAME=your_database_name
DBPASSWORD=your_db_password
CERTPATH=path/to/your/certificate.pem
```

### Connection Manager Configuration
```
DB_PREFERRED_SOURCE=supabase          # 'supabase' or 'postgresql'
DB_FALLBACK_ENABLED=true              # Enable/disable fallback
DB_HEALTH_CHECK_INTERVAL=30000        # Health check interval in ms (default: 30s)
DB_CONNECTION_TIMEOUT=5000            # Connection timeout in ms (default: 5s)
DB_MAX_RETRIES=3                       # Max retry attempts (default: 3)
```

## Setup Instructions

### Step 1: Get Supabase Credentials
1. Go to your Supabase project dashboard
2. Navigate to Settings > Database
3. Copy the connection string or individual parameters:
   - Host: Found in connection string or connection pooling settings
   - Port: Usually 5432
   - Database: Usually 'postgres'
   - User: Usually 'postgres'
   - Password: Your database password
   - SSL: Required (set to 'require')

### Step 2: Configure Environment Variables
1. Copy `.env.example` to `.env`
2. Fill in Supabase connection details
3. Fill in self-hosted PostgreSQL details (for fallback)
4. Set `DB_PREFERRED_SOURCE=supabase`
5. Ensure `DB_FALLBACK_ENABLED=true`

### Step 3: Verify Configuration
1. Start the server
2. Check logs for connection messages
3. Look for: "Successfully connected to supabase database" or "Successfully connected to postgresql database"
4. Test health endpoint: `GET /health/database`

## How It Works

### Initialization
1. On server startup, connection manager initializes
2. Attempts connection to preferred database (Supabase by default)
3. If preferred fails and fallback is enabled, attempts fallback database
4. Starts periodic health checks
5. Logs which database is active

### Health Checks
- Runs every 30 seconds (configurable via DB_HEALTH_CHECK_INTERVAL)
- Executes simple query: `SELECT 1`
- If health check fails:
  - Marks connection as unhealthy
  - Attempts reconnection
  - Tries preferred database first, then fallback
  - Updates active connection if successful

### Failover Process
1. Health check detects connection failure
2. Logs warning about connection issue
3. Attempts to reconnect to preferred database
4. If preferred fails, attempts fallback database
5. If fallback succeeds, switches active connection
6. Logs connection switch event
7. Continues serving requests with new connection

### Connection Retry
- Uses exponential backoff: 1s, 2s, 4s delays
- Maximum retries: 3 (configurable)
- Retries both preferred and fallback connections
- Logs each retry attempt

## API Endpoints

### Database Health Check
**Endpoint:** `GET /health/database`

**Response (Healthy):**
```json
{
  "status": "healthy",
  "database": "supabase",
  "timestamp": "2024-11-21T20:00:00.000Z"
}
```

**Response (Unhealthy):**
```json
{
  "status": "unhealthy",
  "database": "none",
  "timestamp": "2024-11-21T20:00:00.000Z",
  "message": "Database connection is not healthy"
}
```

## Usage in Code

### Getting Database Pool
All models should use the centralized connection manager:

```javascript
import { getPool } from '../config/database.js';

// In your function
const pool = getPool();
const result = await pool.query('SELECT * FROM table');
```

### Checking Connection Status
```javascript
import { getConnectionType, isConnectionHealthy } from '../config/database.js';

const connectionType = getConnectionType(); // 'supabase' or 'postgresql'
const isHealthy = isConnectionHealthy();    // true or false
```

## Monitoring

### Log Messages
The connection manager logs important events:
- Connection attempts (with database type)
- Successful connections
- Connection failures
- Health check results
- Failover events
- Reconnection attempts

### Key Log Patterns
- `[DB-MANAGER] Attempting supabase connection` - Connection attempt
- `[DB-MANAGER] Successfully connected to supabase database` - Success
- `[DB-MANAGER] Health check failed for supabase` - Health issue
- `[DB-MANAGER] Switched to postgresql database` - Failover occurred

## Troubleshooting

### Issue: Cannot Connect to Supabase
**Symptoms:**
- Logs show "Failed to connect to supabase"
- Health check endpoint returns unhealthy

**Solutions:**
1. Verify Supabase credentials in `.env`
2. Check network connectivity to Supabase
3. Verify SSL mode is set correctly
4. Check Supabase project status
5. Verify database is not paused (Supabase free tier)

### Issue: Fallback Not Working
**Symptoms:**
- Supabase fails but doesn't switch to PostgreSQL
- Logs show "Failed to establish connection to any database"

**Solutions:**
1. Verify `DB_FALLBACK_ENABLED=true`
2. Check PostgreSQL credentials in `.env`
3. Verify PostgreSQL server is running
4. Check network connectivity to PostgreSQL
5. Verify SSL certificate path if using SSL

### Issue: Connection Drops Frequently
**Symptoms:**
- Frequent failover events in logs
- Intermittent database errors

**Solutions:**
1. Check network stability
2. Verify connection pool settings
3. Check database server resources
4. Review health check interval (may be too frequent)
5. Check for connection leaks

### Issue: Models Still Using Old Connection
**Symptoms:**
- Models create their own Pool instances
- Multiple connection pools in use

**Solutions:**
1. Ensure all models import `getPool` from `database.js`
2. Remove direct Pool instantiation from models
3. Replace `pool.query` with `getPool().query`
4. Verify no models import `dbConfig` directly

## Operational Procedures

### Manual Database Switch
To manually switch preferred database:
1. Set `DB_PREFERRED_SOURCE` to desired database
2. Restart server
3. Connection manager will attempt new preferred database first

### Disable Fallback
To disable automatic fallback:
1. Set `DB_FALLBACK_ENABLED=false`
2. Restart server
3. System will only use preferred database

### Monitor Connection Health
1. Use health check endpoint: `GET /health/database`
2. Check application logs for connection events
3. Monitor for failover events
4. Track connection type changes

### Graceful Shutdown
The connection manager handles graceful shutdown:
- Closes health check intervals
- Closes active connection pool
- Waits for pending queries to complete
- Logs shutdown events

## Best Practices

### Development
- Use Supabase for development (easier setup)
- Keep PostgreSQL fallback configured for testing
- Monitor logs during development

### Production
- Use Supabase as primary (managed service)
- Keep PostgreSQL as reliable fallback
- Monitor health check endpoint
- Set up alerts for failover events
- Regular testing of failover mechanism

### Security
- Never commit `.env` file
- Rotate database passwords regularly
- Use different credentials for dev/staging/production
- Secure SSL certificates
- Limit database access to application servers

## Performance Considerations

### Connection Pooling
- Single shared pool across all models
- Default pool size: 20 connections
- Idle timeout: 30 seconds
- Connection timeout: 5 seconds

### Health Check Impact
- Health checks run in background
- Minimal performance impact
- Configurable interval (default: 30s)
- Non-blocking for application requests

### Failover Performance
- Failover is automatic but not instant
- Health check interval determines detection time
- Reconnection attempts may take a few seconds
- Requests during failover may fail (retry recommended)

## Migration Notes

### From Old System
If migrating from the old database configuration:
1. All models have been updated to use `getPool()`
2. Old `dbConfig` export is maintained for backward compatibility
3. No code changes needed in controllers
4. Models automatically use new connection manager

### Database Compatibility
- Supabase uses PostgreSQL, so SQL queries are compatible
- No schema changes required
- Same connection interface (pg Pool)
- SSL configuration may differ

## Testing

### Test Supabase Connection
1. Set only Supabase credentials
2. Set `DB_PREFERRED_SOURCE=supabase`
3. Start server
4. Verify connection in logs
5. Test database operations

### Test PostgreSQL Fallback
1. Set invalid Supabase credentials
2. Set valid PostgreSQL credentials
3. Set `DB_FALLBACK_ENABLED=true`
4. Start server
5. Verify fallback to PostgreSQL in logs
6. Test database operations

### Test Failover
1. Start with Supabase connected
2. Stop Supabase or block network access
3. Wait for health check to detect failure
4. Verify automatic switch to PostgreSQL
5. Check logs for failover event

## Support

For issues or questions:
1. Check application logs for error messages
2. Verify environment variables are set correctly
3. Test database connectivity manually
4. Review this documentation
5. Check Supabase status page
6. Verify PostgreSQL server status

---

**Last Updated:** November 21, 2025  
**Version:** 1.0

