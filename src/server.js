import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {} from 'dotenv/config';
import routes from './routes/apiroutes.js';
import logger from './config/logger.js';

// Validate required environment variables on startup
const requiredEnvVars = [
  'PORT',
  'CORS_ORIGIN',
  'Token_Secret_Key',
  'DBUSERNAME',
  'DATABASENAME',
  'DBPASSWORD',
  'DBPORT',
  'DBHOST',
  'CERTPATH',
];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT;
const isProd = process.env.NODE_ENV === 'production';

// Helmet: strict configuration in production (HSTS, CSP, etc.)
app.use(
  helmet(
    isProd
      ? {
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          },
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          },
        }
      : {}
  )
);

// Restrictive CORS (no wildcard in production)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'https://secondbeat.example.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting for sensitive endpoints (auth, create, upload)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const createAdLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many ad creations, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware to parse JSON bodies
app.use(express.json());

// parse incoming Request Object if object, with nested objects, or generally any type.
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Hello, this is the root API endpoint!' });
});

// API routes
app.use('/api/v1', routes);

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
