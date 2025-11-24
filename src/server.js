import express from 'express';
import helmet from 'helmet';
import {} from 'dotenv/config';
import routes from './routes/apiroutes.js';
import {
  getConnectionType,
  isConnectionHealthy,
} from './config/database.js';


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

// Database health check endpoint
app.get('/health/database', (req, res) => {
  try {
    const connectionType = getConnectionType();
    const isHealthy = isConnectionHealthy();

    if (isHealthy) {
      res.status(200).json({
        status: 'healthy',
        database: connectionType,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        database: connectionType || 'none',
        timestamp: new Date().toISOString(),
        message: 'Database connection is not healthy',
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'none',
      timestamp: new Date().toISOString(),
      message: error.message,
    });
  }
});

// API routes
app.use('/api/v1', routes);

// Start serverls
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
