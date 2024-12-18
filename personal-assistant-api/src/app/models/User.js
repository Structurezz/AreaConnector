import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(), // Use MongoDB ObjectId as a string for UUID-like behavior
      unique: true,
    },
    name: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    smsCode: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true, // Automatically add `createdAt` and `updatedAt`
    collection: 'users', // Equivalent to `tableName` in Sequelize
  }
);

// Create the Mongoose model
const User = mongoose.model('User', userSchema);

export default User;
