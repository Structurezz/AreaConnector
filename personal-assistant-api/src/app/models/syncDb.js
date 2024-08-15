import sequelize from '../../lib/config/database.js';
import { User, Transaction } from '../models/index.js';

const syncDb = async () => {
    try {
        await sequelize.sync({ force: true });
        console.log('Database synchronized');
    } catch (error) {
        console.error('Error synchronizing database:', error);
    }
};

syncDb();
