// userMiddleware.js

export const verifyUser = async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await User.findOne({ where: { id } });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      req.user = user; // Attach the user object to the request
      next(); // Move on to the next middleware/controller
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
  