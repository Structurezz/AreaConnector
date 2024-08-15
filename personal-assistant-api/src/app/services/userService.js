// userService.js

export const getUserById = async (id) => {
    try {
      const user = await User.findOne({ where: { id } });
      return user;
    } catch (err) {
      throw new Error('Unable to fetch user');
    }
  };
  
  // In your controller:
  export const getUserByIdController = async (req, res) => {
    try {
      const { id } = req.params;
      const user = await getUserById(id);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
  