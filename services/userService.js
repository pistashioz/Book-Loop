const db = require('../models');
const { User, Configuration, UserConfiguration } = db;
const { ValidationError } = require('sequelize');

async function updateProfileSettings(userId, body) {
    const { about, defaultLanguage, showCity } = body;
    const t = await sequelize.transaction();

    try {
        const user = await User.findByPk(userId, { transaction: t });

        if (!user) {
            await t.rollback();
            return { status: 404, data: { message: "User not found." } };
        }

        // Update user profile details within a transaction
        await user.update({
            about: about !== undefined ? about : user.about,
            defaultLanguage: defaultLanguage || user.defaultLanguage,
            showCity: showCity !== undefined ? showCity : user.showCity
        }, { transaction: t });

        await t.commit();
        return {
            message: "User profile updated successfully",
            user: {
                about: user.about,
                defaultLanguage: user.defaultLanguage,
                showCity: user.showCity
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

async function updateAccountSettings(userId, body, res) {
    const { email, username, name, birthdayDate, holidayMode, currentPassword, newPassword, confirmPassword } = body;

    // Validate presence of password fields
    if (!currentPassword || !newPassword || !confirmPassword) {
        return { status: 400, data: { message: "All password fields must be provided." } };
    }

    let transaction;

    try {
        transaction = await db.sequelize.transaction();

        const user = await User.findByPk(userId, { transaction });
        if (!user) {
            await transaction.rollback();
            return { status: 404, data: { message: "User not found." } };
        }

        // Validate current password
        if (!(await user.validPassword(currentPassword))) {
            await transaction.rollback();
            return { status: 401, data: { message: "Invalid current password." } };
        }
        
        // Validate new password confirmation
        if (newPassword !== confirmPassword) {
            await transaction.rollback();
            return { status: 400, data: { message: "New passwords do not match." } };
        }

        // Update the user's password and mark as changed
        user.password = newPassword;
        user.changed('password', true);

        let isEmailChanged = email && email !== user.email;
        const updateData = {
            email: email || user.email,
            username: username || user.username,
            name: name || user.name,
            birthDate: birthdayDate || user.birthDate,
            holidayMode: holidayMode !== undefined ? holidayMode : user.holidayMode,
            isVerified: !isEmailChanged ? user.isVerified : false
        };

        // Save changes
        await user.save({ transaction });

        if (newPassword) {
            // Invalidate all sessions due to password change
            await logoutUserSessions(userId, transaction);
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
        }

        if (isEmailChanged) {
            sendVerificationEmail(user.email);
        }

        await transaction.commit();
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
        if (transaction) await transaction.rollback();
        console.error("Error during the transaction:", error);
        return { status: 500, data: { message: "Error updating user account", error: error.message } };
    }
}

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

async function updateNotificationSettings(userId, settings) {
    let transaction;
    try {
        transaction = await db.sequelize.transaction();

        // Iterate over the settings provided in the request body
        for (const [configKey, configValue] of Object.entries(settings)) {
            // First, fetch the corresponding configuration ID
            const config = await Configuration.findOne({
                where: {
                    configKey: configKey,
                    configType: 'notifications'
                }
            });

            // Throw an error if the configuration key is invalid (does not exist in the database)
            if (!config) {
                throw new Error(`Invalid config key: ${configKey}`);
            }

            // Update the user's configuration value
            await UserConfiguration.update({
                configValue: configValue
            }, {
                where: {
                    userId: userId,
                    configId: config.configId
                },
                transaction: transaction
            });
        }

        await transaction.commit();
        return { message: "Notification settings updated successfully" };
    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error("Error updating notification settings", error);
        throw new Error("Failed to update notification settings");
    }
}

async function updatePrivacySettings(userId, settings) {
    let transaction;
    try {
        transaction = await db.sequelize.transaction();

        for (const [configKey, configValue] of Object.entries(settings)) {
            const config = await Configuration.findOne({
                where: { configKey, configType: 'privacy' }
            });

            if (!config) {
                throw new Error(`Invalid config key: ${configKey}`);
            }

            const result = await UserConfiguration.upsert({
                userId: userId,
                configId: config.configId,
                configValue: configValue
            }, { transaction: transaction });

            console.log(`Update result for ${configKey}:`, result);
        }

        await transaction.commit();
        return { message: "Privacy settings updated successfully" };
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Error updating privacy settings", error);
        return { message: "Failed to update privacy settings", error: error.message || error.toString() };
    }
}

module.exports = {
    updateProfileSettings,
    updateAccountSettings,
    updateNotificationSettings,
    updatePrivacySettings,
    logoutUserSessions,
    sendVerificationEmail
};
