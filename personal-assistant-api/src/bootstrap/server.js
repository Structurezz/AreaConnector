import express from 'express';
import { config } from 'dotenv';
import router from '../routes/index.js';
import loggerMiddleware from '../app/middleware/logger.js';
import errorHandler from '../app/middleware/errorHandler.js';
import corsMiddleware from '../app/middleware/cors.js';
import rateLimiter from '../app/middleware/rateLimit.js';

import connectDB from '../lib/config/database.js'; 
import authRoutes from '../routes/authRoutes.js'; 

// Load environment variables
config();

// Initialize express app
const app = express();

// Apply middleware
app.use(loggerMiddleware);
app.use(corsMiddleware);
app.use(rateLimiter);
app.use(express.json()); 

// Use routes
app.use('/api', router); 
app.use('/api/auth', authRoutes); 

// Error handling middleware should be applied last
app.use(errorHandler);

// Connect to the database and start the server
let server; 
const startServer = async () => {
  try {
    await connectDB(); 
    console.log('INCOPERATED AND ACTIVE TO RECEIVE DATA🏛️⛔...');

    const PORT = process.env.PORT || 9;
    server = app.listen(PORT, () => {
      console.log(`⚙️🛠️ running on port${PORT} 🌐✅`);
    });
  } catch (error) {
    console.error('Error starting server:', error.message);
    process.exit(1); // Exit with failure
  }
};

// Start the server
startServer();

// Export app and server
export { app, server };
