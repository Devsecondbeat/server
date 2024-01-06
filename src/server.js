import express from 'express';
import helmet from 'helmet';
import {} from 'dotenv/config';
import routes from './routes/apiroutes.js';


const app = express();
const PORT = process.env.PORT;

//app.use(helmet());
// Middleware to parse JSON bodies
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello, this is the root API endpoint!' });
});
// API routes
app.use('/api/v1', routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
