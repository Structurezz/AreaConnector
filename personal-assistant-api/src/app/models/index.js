import User from './User.js';
import Transaction from './Transaction.js';


// Define associations
User.hasMany(Transaction, { foreignKey: 'userId' });
Transaction.belongsTo(User, { foreignKey: 'userId' });

// Execute the synchronization logic
// Assuming synced.js exports a function to sync models

export { User, Transaction };
