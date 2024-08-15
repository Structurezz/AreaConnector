import axios from 'axios';

const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines';
const API_KEY = process.env.NEWS_API_KEY; // Ensure you have this in your .env file

export const getNewsUpdates = async () => {
    try {
        const response = await axios.get(NEWS_API_URL, {
            params: {
                apiKey: API_KEY,
                country: 'us',
                pageSize: 5
            }
        });
        return response.data.articles;
    } catch (error) {
        console.error('Error fetching news updates:', error);
        throw new Error('Unable to fetch news updates');
    }
};
