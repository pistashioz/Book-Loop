// Import DB configuration and Sequelize operators
const db = require('../models');
const { Op, ValidationError } = require('sequelize');


// Access models through the centralized db object
const { User, UserConfiguration, Configuration, SessionLog, Token } = db;
const { issueAccessToken, handleRefreshToken } = require('../middleware/authJwt'); 


// Retrieve all users
exports.findAll = async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving users", error: error.message });
    }
};

// Retrieve a single user by ID
exports.findOne = async (req, res) => {
    const { id } = req.params;
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

  // Start a transaction - either all goes well, or none at all
  const t = await sequelize.transaction();

  try {
    // Create a new user
    const newUser = await User.create({ username, 
      email, 
      password,
      birthDate }, { transaction: t });


      // Fetch all configurations from the configuration table
      const configurations = await Configuration.findAll({ transaction: t });

    // Create a userConfiguration record for each configuration
    const configPromises = configurations.map(config => 
        UserConfiguration.create({
            userId: newUser.userId,
            configId: config.configId,
            configValue: activateConfigs ? 'true' : 'false'  // Set based on activateConfigs flag
        }, { transaction: t })
    );

      // Wait for all promises to resolve
      await Promise.all(configPromises);
    

    // Commit the transaction
    await t.commit();

    res.status(201).json({
      message: "User registered successfully.",
      user: newUser
    });    
  } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({
                message: "Validation error",
                errors: error.errors.map(e => e.message)
            });
        }
        res.status(500).json({ message: "Error creating user", error: error.message });
    }
};

// Update a user
exports.update = async (req, res) => {
  const { id } = req.params;
  try {
      const [updated] = await User.update(req.body, { where: { userId: id } });
      if (updated) {
          const updatedUser = await User.findByPk(id);
          res.status(200).json({ message: "User updated successfully.", user: updatedUser });
      } else {
          res.status(404).json({ message: "User not found." });
      }
  } catch (error) {
      if (error instanceof ValidationError) {
          return res.status(400).json({
              message: "Validation error",
              errors: error.errors.map(e => e.message)
          });
      }
      res.status(500).json({ message: "Error updating user", error: error.message });
  }
};


// Delete a user
exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
      const deleted = await User.destroy({ where: { userId: id } });
      if (deleted) {
          res.status(200).json({ message: "User deleted successfully." });
      } else {
          res.status(404).json({ message: "User not found." });
      }
  } catch (error) {
      res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};



// Login action for user
exports.login = async (req, res) => {
    const { usernameOrEmail, password } = req.body;
    
    // Start a transaction
    const t = await db.sequelize.transaction();
    
    try {
        // Attempt to find the user by username or email
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: usernameOrEmail },
                    { username: usernameOrEmail }
                ]
            }
        }, { transaction: t });
        
        // If no user is found, return a 404 error
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: "User not found" });
        }
        
        // Check if the provided password matches the one stored in the database
        const isValidPassword = await user.validPassword(password);
        if (!isValidPassword) {
            // If password does not match, return a 401 error for unauthorized access
            await t.rollback();
            return res.status(401).json({ message: "Invalid username or password" });
        }
        
        // Check for existing active sessions with the same device info
        const existingSession = await SessionLog.findOne({
            where: {
                userId: user.userId,
                ipAddress: req.ip,  
                deviceInfo: req.headers['user-agent'],
                endTime: null  
            }
        }, { transaction: t });
        
        if (existingSession) {
            // If an active session exists, deny the new login attempt
            await t.rollback();
            return res.status(409).json({ message: "Active session already exists for this device and browser. Please log out from other sessions or continue using them." });
        }
        
        // Create a session log entry and capture its ID
        const sessionLog = await SessionLog.create({
            userId: user.userId,
            startTime: new Date(),
            ipAddress: req.ip,  // Obtaining IP address from request
            deviceInfo: req.headers['user-agent']  // Extracting device info from the user-agent header
        }, { transaction: t });
        
        // Generate JWTs using the newly created session log ID
        const accessToken = issueAccessToken(user.userId, sessionLog.sessionId);  // Immediate access token issuance
        handleRefreshToken(user.userId, sessionLog.sessionId);  // Handle refresh token asynchronously
        console.log(`Generated access token: ${accessToken}`);
        
        // Set cookie with HttpOnly and Secure flags
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',  // Ensure secure in production
            expires: new Date(Date.now() + 3600000),  // 1 hour for example
            sameSite: 'strict'  // This setting can help prevent CSRF attacks
        });
        
        // If login is successful, commit the transaction and return user info or a token
        await t.commit();
        res.status(200).json({
            message: "Login successful",
            user: {
                id: user.userId,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        // Rollback transaction in case of any error
        await t.rollback();
        // Handle any unexpected errors during the process
        res.status(500).json({ message: "Error logging in", error: error.message });
    }
};

// Log out action for user
exports.logout = async (req, res) => {
    const sessionId = req.sessionId; // The current session ID obtained from the authenticated user's request

    // Start a transaction for database operations
    const t = await db.sequelize.transaction();

    try {
        // Invalidate the session
        await SessionLog.update({
            endTime: new Date()
        }, {
            where: {
                sessionId: sessionId
            },
            transaction: t
        });

        // Invalidate the refresh token
        await Token.update({
            invalidated: true,
            lastUsedAt: new Date()
        }, {
            where: {
                sessionId: sessionId,
                tokenType: 'refresh',
                invalidated: false // Only update if it's not already invalidated
            },
            transaction: t
        });

        // We could delete the session log entry instead of invalidating it
        // await SessionLog.destroy({
        //     where: {
        //         sessionId: sessionId
        //     },
        //     transaction: t
        // });

        // Clear the access token cookie
        res.cookie('accessToken', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            expires: new Date(0) // Set to a past date to immediately expire the cookie
        });

        await t.commit();

        res.status(200).json({ message: "Logout successful." });
    } catch (error) {
        console.error("Failed operation: ", error);
        await t.rollback();
        res.status(500).json({ message: "Error during logout", error: error.message });
    }
};

// Session validation to verify active user sessions
exports.validateSession = (req, res) => {
    // This callback only runs if verifyToken calls next(), meaning the token is valid
    res.status(200).json({
        message: "Session is valid.",
        user: {
            id: req.userId,  
            username: req.username // I think we might need to fetch the username from the database here, cb the middleware is not adding it to the request!
        }
    });
};

