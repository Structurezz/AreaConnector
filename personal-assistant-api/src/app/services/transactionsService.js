import axios from 'axios';

const TRANSACTION_API_URL = 'https://api.yourbank.com/transactions'; // Example API URL
const API_KEY = process.env.BANK_API_KEY; // Ensure you have this in your .env file

export const makeTransaction = async (amount, bankDetails) => {
    try {
        const response = await axios.post(TRANSACTION_API_URL, {
            amount,
            bankDetails
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error making transaction:', error);
        throw new Error('Unable to make transaction');
    }
};
