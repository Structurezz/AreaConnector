import cors from 'cors';

const corsOptions = {
    origin: 'http://localhost:3000', // Adjust based on your front-end URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
