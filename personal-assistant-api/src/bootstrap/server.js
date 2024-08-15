import express from 'express';
import { config } from 'dotenv';
import router from '../routes/index.js';
import loggerMiddleware from '../app/middleware/logger.js';
import errorHandler from '../app/middleware/errorHandler.js';
import authenticate from '../app/middleware/authenticate.js';
import validateRequest from '../app/middleware/validateRequest.js';
import corsMiddleware from '../app/middleware/cors.js';
import rateLimiter from '../app/middleware/rateLimit.js';
import sequelize from '../lib/config/database.js';
import { User, Transaction } from '../app/models/index.js'; // Import models
import connectDB  from '../lib/config/database.js';
import { sendEmail } from '../app/services/emailService.js';
import authRoutes from '../routes/authRoutes.js '

// Load environment variables
config();

const app = express();

// Apply middleware
app.use(loggerMiddleware);
app.use(corsMiddleware);
app.use(rateLimiter);
app.use(express.json()); // Parse JSON bodies
app.use('/api', router); // Use API routes
app.use('/api/auth', authRoutes);



// Apply authentication middleware where needed
// Example: app.use('/secure-endpoint', authenticate, secureRoutes);

// Apply validation middleware where needed
// Example: app.post('/data', validateRequest, (req, res) => { /* handler */ });

// Error handling middleware should be last
app.use(errorHandler);

// Function to synchronize database models
const syncDatabase = async () => {
    try {
        await sequelize.sync(); // Use { force: true } if you want to reset the database
        console.log('Database synchronized');
    } catch (error) {
        console.error('Error synchronizing database:', error);
        throw error; // Rethrow the error to handle it in main.js
    }
};

const server = sequelize.sync({ alter: true }).then(() => {
    const PORT = process.env.PORT || 3000;
    return app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
  

// Export app and syncDatabase function
export { app, syncDatabase };
