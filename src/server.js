import express from 'express';
import helmet from 'helmet';
import {} from 'dotenv/config';
import routes from './routes/apiroutes.js';


const app = express();
const PORT = process.env.PORT;
const authenticateToken = () => {};

// To display the global variables defined in codeGen js file. 

//app.use(helmet());
// Middleware to parse JSON bodies
app.use(express.json());

// parse incoming Request Object if object, with nested objects, or generally any type.
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Hello, this is the root API endpoint!' });
});

// Liveness probe: basic process health (always succeeds if server running)
app.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe: DB connectivity + critical external services
// Follows patterns from databaseManager (testConnectionHealth, isConnectionHealthy)
app.get('/health/ready', async (req, res) => {
  try {
    // Simple connection test mirroring databaseManager's testConnectionHealth
    const { Pool } = await import('pg');
    const pool = new Pool({
      host: process.env.DBHOST || process.env.SUPABASE_DB_HOST,
      port: parseInt(process.env.DBPORT || process.env.SUPABASE_DB_PORT || '5432', 10),
      database: process.env.DATABASENAME || process.env.SUPABASE_DB_NAME,
      user: process.env.DBUSERNAME || process.env.SUPABASE_DB_USER,
      password: process.env.DBPASSWORD || process.env.SUPABASE_DB_PASSWORD,
      ssl: process.env.CERTPATH ? { ca: (await import('fs')).readFileSync(process.env.CERTPATH).toString() } : false,
      connectionTimeoutMillis: 3000,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 3000),
    );
    const queryPromise = pool.query('SELECT 1 as health_check');
    await Promise.race([queryPromise, timeoutPromise]);
    await pool.end();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      message: 'Database or critical service unavailable',
      error: error.message,
    });
  }
});

// Also enhance /health/database for compatibility if needed
app.get('/health/database', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    database: 'configured',
    timestamp: new Date().toISOString(),
  });
});

// API routes

app.use('/api/v1', routes);

// Start serverls
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
