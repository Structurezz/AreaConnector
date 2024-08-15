import winston from 'winston';

// Create a Winston logger instance
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

const loggerMiddleware = (req, res, next) => {
    logger.info(`Received request: ${req.method} ${req.url}`);
    next();
};

export default loggerMiddleware;
