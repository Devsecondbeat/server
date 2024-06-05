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
// API routes
app.use('/api/v1', routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
