const errorHandler = (err, req, res, next) => {
    console.error('Error message:', err.message);
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
};

export default errorHandler;
