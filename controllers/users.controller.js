// Import DB configuration and Sequelize operators
const db = require('../models');
const dayjs = require('dayjs');
const { Op, ValidationError } = require('sequelize');


// Access models through the centralized db object
const { User, UserConfiguration, Configuration, SessionLog, Token, PostalCode } = db;
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
            return res.status(404).json({ message: "User not found!!!" });
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
    
    
// Delete a user - this needs to be turned into a patch request to alter just the isActive status and set a deletion date
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
        
        // Set cookie with HttpOnly and Secure flags
        res.cookie('accessToken', accessToken.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            expires: new Date(dayjs().add(accessToken.expirationMins, 'ms').valueOf()), // Converts to appropriate date format
            sameSite: 'strict'
        });
        
/*         console.log(`refreshToken: ${refreshToken.token} and expires in ${refreshToken.expirationTime} seconds`);
        res.cookie('refreshToken', refreshToken.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV!== 'development',
            expires: new Date(dayjs().add(refreshToken.expirationTime, 'seconds').valueOf()), // Converts to appropriate date format
            sameSite: 'strict',
            path: '/refresh'
        }); */
        
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
        res.clearCookie('accessToken')
        
        await t.commit();
        
        res.status(200).json({ message: "Logout successful.", logout: true});
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

    
// Update or create a user address and corresponding postal code
exports.updateUserAddress = async (req, res) => {
    const userId = req.userId;  // from middleware
    const { street, streetNumber, postalCode, locality, country } = req.body;
    
    const t = await db.sequelize.transaction();
    
    try {
        // First, check if all address fields are provided or if all are empty
        const addressFields = [street, streetNumber, postalCode];
        const allFieldsProvided = addressFields.every(field => field);
        const noFieldsProvided = addressFields.every(field => !field);
        
        if (!allFieldsProvided && !noFieldsProvided) {
            await t.rollback();
            return res.status(400).json({ message: "All address fields must be provided together or none at all." });
        }
        
        // Handle updates or creation of address details
        const user = await User.findByPk(userId, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: "User not found." });
        }
        
        if (allFieldsProvided) {
            // Verify that locality and country are provided when postal code is involved
            if (!locality || !country) {
                await t.rollback();
                return res.status(400).json({ message: "Both locality and country must be provided with postal code." });
            }
            
            // Check for existing postal code or create new one
            let postalCodeRecord = await PostalCode.findByPk(postalCode, { transaction: t });
            if (!postalCodeRecord) {
                postalCodeRecord = await PostalCode.create({ postalCode, locality, country }, { transaction: t });
            } else {
                await postalCodeRecord.update({ locality, country }, { transaction: t });
            }
            
            // Update user's address fields
            await user.update({ street, streetNumber, postalCode }, { transaction: t });
        } else {
            // If no fields are provided and user intends to clear address, reset the fields
            await user.update({ street: null, streetNumber: null, postalCode: null }, { transaction: t });
        }
        
        await t.commit();
        return res.status(200).json({
            message: "User address updated successfully",
            user: {
                street: user.street,
                streetNumber: user.streetNumber,
                postalCode: user.postalCode,
                locality: postalCodeRecord ? postalCodeRecord.locality : null,
                country: postalCodeRecord ? postalCodeRecord.country : null
            }
        });
        
    } catch (error) {
        await t.rollback();
        if (error instanceof ValidationError) {
            return res.status(400).json({
                message: "Validation error",
                errors: error.errors.map(e => e.message)
            });
        }
        console.error("Error updating user address:", error);
        return res.status(500).json({ message: "Error updating user address", error: error.message });
    }
};
       
// Get user settings accordingly to query params
exports.getUserSettings = async (req, res) => {
    const userId = req.userId; // gotten from verifyToken middleware
    const type = req.query.type;
    
    try {
        switch (type) {
            case 'profile':
            const profileData = await fetchProfileSettings(userId);
            res.status(200).json(profileData);
            break;
            case 'account':
            const accountData = await fetchAccountSettings(userId);
            res.status(200).json(accountData);
            break;
            case 'notifications':
            const notificationsData = await fetchNotificationsSettings(userId);
            res.status(200).json(notificationsData);
            break;
            case 'privacy':
            const privacyData = await fetchPrivacySettings(userId);
            res.status(200).json(privacyData);
            break;
            default:
            res.status(400).json({ message: "Invalid settings type specified" });
            break;
        } 
    } catch (error) {
        console.error('Error fetching user settings', error);
        res.status(500).json({ message: "Error retrieving settings", error: error.message });
    }
};

async function fetchProfileSettings(userId) {
    const userProfile = await db.User.findByPk(userId, {
        include: [
            {
                model: db.PostalCode,
                as: 'postalCodeDetails',
            }
        ]
    });
    
    if (!userProfile) {
        throw new Error('User not found');
    }
    
    // Construct a response object
    return {
        username: userProfile.username,
        email: userProfile.email,
        profileImage: userProfile.profileImage,
        about: userProfile.about,
        defaultLanguage: userProfile.defaultLanguage,
        address: {
            streetName: userProfile.street,
            streetNumber: userProfile.streetNumber,
            postalCode: userProfile.postalCodeDetails.postalCode,
            locality: userProfile.postalCodeDetails.locality,
            country: userProfile.postalCodeDetails.country
        },
        showCity: userProfile.showCity
    };
}
    
/**
* Fetches the account settings of a user.
* 
* @param {number} userId - The ID of the user.
* @returns {object} The account settings of the user.
*/
async function fetchAccountSettings(userId) {
    const user = await db.User.findByPk(userId, {
        include: [
            {
                model: db.UserSocialMedia,
                as: 'userSocialMedias',
            }
        ]
    });
    
    if (!user) {
        throw new Error('User not found');
    }
    
    return {
        email: user.email,
        username: user.username,
        name: user.name,
        birthdayDate: user.birthDate,
        holidayMode: user.holidayMode,
        socialMediaProfiles: user.userSocialMedias? user.userSocialMedias.map(sm => ({
            socialMediaName: sm.socialMediaName,
            profileUrl: sm.profileUrl
        })) : []
    };
}
    
    
// Update user settings based on type
exports.updateUserSettings = async (req, res) => {
    const userId = req.userId;  // Extracted from verifyToken middleware
    const type = req.query.type;
    
    try {
        switch (type) {
            case 'profile':
            const profileUpdateData = await updateProfileSettings(userId, req.body);
            res.status(200).json(profileUpdateData);
            break;
            case 'account':
            const accountUpdateData = await updateAccountSettings(userId, req.body);
            res.status(200).json(accountUpdateData);
            break;
            // Add other cases as necessary
            default:
            res.status(400).json({ message: "Invalid settings type specified" });
            break;
        }
    } catch (error) {
        console.error('Error updating user settings', error);
        res.status(500).json({ message: "Error updating settings", error: error.message });
    }
};
   

async function updateProfileSettings(userId, body) {
    const { about, defaultLanguage, showCity } = body; // const { about, defaultLanguage, showCity, profileImage } = body;
    const t = await db.sequelize.transaction();

    try {
        const user = await db.User.findByPk(userId, { transaction: t });

        if (!user) {
            await t.rollback();
            return { status: 404, data: { message: "User not found." } };
        }

        // Update user profile details within a transaction
        await user.update({
            about: about !== undefined ? about : user.about,
            defaultLanguage: defaultLanguage || user.defaultLanguage,
            showCity: showCity !== undefined ? showCity : user.showCity,
            // profileImage: profileImage || user.profileImage
        }, { transaction: t });

        await t.commit();
        return {
            message: "User profile updated successfully",
            user: {
                about: user.about,
                defaultLanguage: user.defaultLanguage,
                showCity: user.showCity,
                // profileImage: user.profileImage
            }
        };
    } catch (error) {
        await t.rollback();
        if (error instanceof ValidationError) {
            return { status: 400, data: { message: "Validation error", errors: error.errors.map(e => e.message) } };
        }
        console.error("Error updating user profile:", error);
        return { status: 500, data: { message: "Error updating user profile", error: error.message } };
    }
}

    
// Update user account settings
async function updateAccountSettings(userId, body) {
    const { email, username, name, birthdayDate, holidayMode, currentPassword, newPassword, confirmPassword } = body;
    let t;

    try {
        t = await db.sequelize.transaction();

        const user = await db.User.findByPk(userId, { transaction: t });
        if (!user) {
            await t.rollback();
            return { status: 404, data: { message: "User not found." } };
        }
        console.log(`currentPassword: ${currentPassword}, newPassword: ${newPassword}, confirmPassword: ${confirmPassword}`);
        // Verify current password before allowing update
        if ((currentPassword) && newPassword && confirmPassword) {
            if (!await user.validPassword(currentPassword)) {
                await t.rollback();
                return { status: 401, data: { message: "Invalid current password." } };
            }
            if (newPassword !== confirmPassword) {
                await t.rollback();
                return { status: 400, data: { message: "New passwords do not match." } };
            }

            user.password = newPassword;  // Triggers password hash hook
        }

        let isEmailChanged = email && email !== user.email;
        const updateData = {
            email: email || user.email,
            username: username || user.username,
            name: name || user.name,
            birthDate: birthdayDate || user.birthDate,
            holidayMode: holidayMode !== undefined ? holidayMode : user.holidayMode,
            isVerified: isEmailChanged ? false : user.isVerified
        };

        await user.update(updateData, { transaction: t });

        if (newPassword) {
            // Trigger global logout when password changes
            await logoutUserSessions(userId, t);
        }

        if (isEmailChanged) {
            sendVerificationEmail(user.email);
        }

        await t.commit();
        return {
            message: "User account updated successfully",
            user: {
                email: user.email,
                username: user.username,
                name: user.name,
                birthdayDate: user.birthDate,
                holidayMode: user.holidayMode,
                isVerified: user.isVerified
            }
        };
    } catch (error) {
        if (t) await t.rollback();
        if (error instanceof ValidationError) {
            return { status: 400, data: { message: "Validation error", errors: error.errors.map(e => e.message) } };
        }
        console.error("Error during the transaction:", error);
        return { status: 500, data: { message: "Error updating user account", error: error.message }};
    }
}


// Logout from all sessions globally
async function logoutUserSessions(userId, transaction) {
    console.log(`Logging out all sessions globally for user ${userId}...`);
    try {
        // Invalidate all session logs for the user
        await SessionLog.update({
            endTime: new Date()
        }, {
            where: {
                userId: userId,
                endTime: null
            },
            transaction
        });
        
        // Invalidate all tokens for the user
        await Token.update({
            invalidated: true,
            lastUsedAt: new Date()
        }, {
            where: {
                userId: userId,
                invalidated: false,
                lastUsedAt: null
            },
            transaction
        });
    } catch (error) {
        console.error("Failed to log out sessions globally", error);
        throw error;  // Propagate this error up to catch it in the calling function
    }
}


function sendVerificationEmail(email) {
    console.log(`Sending verification email to ${email}`);
    // email sending logic here
}