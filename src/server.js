import express from 'express';
import helmet from 'helmet';
import {} from 'dotenv/config';
import routes from './routes/apiroutes.js';
import logger from './config/logger.js';

const app = express();
const PORT = process.env.PORT;

// To display the global variables defined in codeGen js file. 

//app.use(helmet());
// Middleware to parse JSON bodies
app.use(express.json());

// parse incoming Request Object if object, with nested objects, or generally any type.
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Hello, this is the root API endpoint!' });
});
// API routes

app.use('/api/v1', routes);

export default app;

export function start() {
  const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
  return server;
}

// Auto-start when run directly (ESM equivalent of `if (require.main === module)`)
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
