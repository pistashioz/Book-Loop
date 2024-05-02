// Import all models from the index.js in the models directory
const sequelize = require('../db.js');
const { User, UserConfiguration, Configuration } = require('../models');


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

  // Extract the required fields from the request body
  const { username, email, password, birthDate,activateConfigs, acceptTAndC } = req.body;

  if (!username || !email || !password || !birthDate || !acceptTAndC) {
    return res.status(400).json({ message: "All fields including birth date must be provided and Terms must be accepted" });
  }

  // Check if user is at least 16 years of age
  const currentDate = new Date();
  const minimumBirthDate = new Date(currentDate.setFullYear(currentDate.getFullYear() - 16));

  // The user's birthDate should be greater than or equal to minimumBirthDate
  if (new Date(birthDate) > minimumBirthDate) {
      return res.status(400).json({ message: "User must be at least 16 years of age to register." });
  }

  // Start a transaction - either all goes well, or none at all
  const t = await sequelize.transaction();

  try {
    // Create a new user
    const newUser = await User.create({ username, 
      email, 
      password,
      birthDate }, { transaction: t });

    // Check if user chose to activate all configurations
    if (activateConfigs) {
      // Fetch all configurations from the configuration table
      const configurations = await Configuration.findAll({ transaction: t });

      // Create a userConfiguration record for each one with default value of true
      const configPromises = configurations.map(config => 
        UserConfiguration.create({
          userId: newUser.userId,
          configId: config.configId,
          configValue: 'true' // 'true' is the default value
        }, { transaction: t })
      );

      // Wait for all promises to resolve
      await Promise.all(configPromises);
    }

    // Commit the transaction
    await t.commit();

    res.status(201).json({
      message: "User registered successfully.",
      user: newUser
    });    
  } catch (error) {
    // If something goes wrong, rollback the transaction
    await t.rollback();
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
