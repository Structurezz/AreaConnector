// Assuming this is within your userController.js

export const getUserById = async (req, res) => {
    try {
      const { id } = req.params; // Get user ID from request parameters
      const User = await User.findOne({ where: { id } });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
  