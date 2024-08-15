import { DataTypes } from 'sequelize';
import sequelize from './../../lib/config/database.js';

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    bankDetails: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'transactions',
    timestamps: true
});

export default Transaction;
