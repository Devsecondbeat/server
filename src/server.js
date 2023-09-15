import express from 'express';
//import tasksRouter from './routes/tasks.js';

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// API routes
//app.use('/api/tasks', tasksRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

