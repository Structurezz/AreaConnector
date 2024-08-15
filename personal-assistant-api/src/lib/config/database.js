import { Sequelize } from 'sequelize';
import { config } from 'dotenv';

config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS
});

// Test the database connection


export default sequelize;

// Test the database connection
export const connectDB = async () => {
    try {
      await sequelize.authenticate();
      console.log('PostgreSQL database connected successfully');
    } catch (error) {
      console.error('Unable to connect to the database:', error.message);
      process.exit(1); // Exit process with failure
    }
  };
  
