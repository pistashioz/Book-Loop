// Import the User model
const User = require('../models/user.model'); // Adjust path as necessary

// Fetch all users
exports.findAll = async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving users", error: error.message });
  }
};

// Fetch a single user by ID
exports.findOne = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving user", error: error.message });
  }
};

// Create a new user
exports.create = async (req, res) => {
  if (!req.body.username || !req.body.email || !req.body.password) {
    return res.status(400).json({ message: "Required fields cannot be empty" });
  }
  try {
    const newUser = await User.create(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error: error.message });
  }
};

// Update a user
exports.update = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await User.update(req.body, { where: { userId: id } });
    if (user == 1) {
      res.status(200).json({ message: "User updated successfully." });
    } else {
      res.status(404).json({ message: "User not found." });
    }
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error: error.message });
  }
};

// Delete a user
exports.delete = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await User.destroy({ where: { userId: id } });
    if (user == 1) {
      res.status(200).json({ message: "User deleted successfully." });
    } else {
      res.status(404).json({ message: "User not found." });
    }
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};
