const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');
const config = require('../config/auth.config');
const db = require('../models');
const { Token, SessionLog } = db;

// Helper function to handle token verification
async function verifyTokenHelper(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, config.secret, (err, decoded) => {
            if (err) {
                // Directly decoding the payload if the error is due to token expiration
                if (err.name === 'TokenExpiredError') {
                    const decodedPayload = jwt.decode(token, { complete: true });
                    reject({ ...err, decodedPayload });  // Include decoded payload in rejection
                } else {
                    console.log('rejecting token verification');
                    reject(err);
                }
            } else {
                resolve(decoded);
            }
        });
    });
}


// Middleware to verify token validity
exports.verifyToken = async (req, res, next) => {
    const accessToken = req.cookies['accessToken'];

    if (!accessToken) {
        return res.status(401).send({ message: "Access Token is missing or expired, please refresh token." });
    }

    try {
        const decoded = await verifyTokenHelper(accessToken);
        req.userId = decoded.id;
        req.sessionId = decoded.session;
        next();
    } catch (err) {
        return res.status(401).send({ message: "Invalid token. Please log in again." });
    }
};

// Function to only issue an access token
exports.issueAccessToken = (userId, sessionId) => {
    try {
        const expirationMins = config.jwtExpiration;
        const expirationTime = dayjs().add(expirationMins, 'minute').unix(); // Expires in 30 minutes
        const token = jwt.sign({ id: userId, session: sessionId }, config.secret, {
            expiresIn: expirationTime
        });
        console.log("Access token signed");
        return { token, expirationMins };
    } catch (error) {
        console.error("Error issuing access token:", error);
        throw new Error("Failed to issue access token.");
    }
};

// Asynchronously handle issuing a new refresh token and invalidating the old one
exports.handleRefreshToken = async (userId, sessionId, invalidateOldToken = false) => {
    try {
        const expirationTime = dayjs().add(config.jwtRefreshExpiration, 'day').unix(); // Expires in 14 days
        const refreshToken = jwt.sign({ id: userId, session: sessionId }, config.secret, {
            expiresIn: expirationTime
        });

        // Start a database transaction
        const t = await db.sequelize.transaction();

        try {
            // If requested, invalidate the old refresh token
            if (!invalidateOldToken) {
                await db.Token.update(
                    { invalidated: true, lastUsedAt: new Date() },
                    { where: { sessionId: sessionId, invalidated: false }, transaction: t }
                );
            }

            // Save the new refresh token
            await db.Token.create({
                tokenKey: refreshToken,
                userId: userId,
                sessionId: sessionId,
                tokenType: 'refresh',
                expiresAt: new Date(dayjs().add(config.jwtRefreshExpiration, 'day').valueOf()),
                invalidated: false
            }, { transaction: t });

            // Commit the transaction
            await t.commit();

            console.log("Refresh token issued and old token invalidated.");
            return refreshToken;
        } catch (error) {
            // Rollback the transaction in case of error
            await t.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error handling refresh token:", error);
        throw new Error("Failed to handle refresh token.");
    }
};


// Function to refresh tokens (to be called by a dedicated refresh endpoint)
exports.refreshTokens = async (req, res) => {
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken) {
         // No refresh token provided, can't proceed with authentication
         return res.status(403).send("Session invalid, please log in again.");
    }

    try {
        const { id, session } = jwt.verify(refreshToken, config.secret);
        const newAccessToken = exports.issueAccessToken(id, session);
        const newRefreshToken = await exports.handleRefreshToken(id, session, true);

        // Set new tokens in cookies
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict'
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: true,
            path: '/refresh',
            sameSite: 'Strict'
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Failed to refresh tokens:", error);
        res.status(403).send({ message: "Failed to refresh tokens. Please log in again." });
    }
};

/* // Middleware to verify token validity
exports.verifyToken = async (req, res, next) => {
    const token = req.cookies['accessToken'];
    const isLogout = req.path.includes('/logout');  // Check if the request is for logout
    
    if (!token && !isLogout) {
        try {
        const deviceInfo = req.headers['user-agent'];
        const { sessionId, userId } = await SessionLog.findOne({
            where: { deviceInfo: deviceInfo, endTime: null }
        }); 
        await invalidateTokenAndSession(sessionId, userId);
    } catch (error) {
        return res.status(403).send({ message: "No authentication provided! Please log in." });
    }}
    
    try {
        const decoded = await verifyTokenHelper(token);
        req.userId = decoded.id;
        req.sessionId = decoded.session;
        next();
    } catch (err) {
        if (err.decodedPayload) { // Check if the decoded payload is available
            req.userId = err.decodedPayload.payload.id;
            req.sessionId = err.decodedPayload.payload.session;
        }
        if (err.name === 'TokenExpiredError') {
            console.log('Token expired, attempting to refresh...');
            try {
                if (isLogout) { 
                    res.clearCookie('accessToken'),
                    await invalidateTokenAndSession(req.sessionId, req.userId);
                    res.status(200).json({ message: "Logout successful.", logout: true});
                }
                else { const newTokens = await exports.refreshTokens(req.userId, req.sessionId);
                    res.cookie('accessToken', newTokens.accessToken, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV !== 'development',
                        expires: new Date(dayjs().add(config.jwtExpiration, 'minute').valueOf()), // Converts to appropriate date format
                        sameSite: 'strict'
                    });
                    req.userId = jwt.decode(newTokens.accessToken).id;
                    next();}
                } catch (refreshError) {
                    return res.status(403).send({ message: refreshError.message });
                }
            } else {
                // if logout present an appropriate error message
                if (isLogout) {
                    return res.status(400).send({ message: "Invalid Request: You are already logged out." });
                }
                return res.status(401).send({ message: "Unauthorized!! Token is invalid." });
            }
        }
    };
 */


/*     // Invalidate token and update session log
    async function invalidateTokenAndSession(sessionId, userId) {
        // Start a transaction
        const t = await db.sequelize.transaction();
    
        try {
            // Update the token as invalidated within the transaction
            await db.Token.update({ invalidated: true, lastUsedAt: new Date() }, {
                where: { 
                    sessionId, 
                    userId, 
                    tokenType: 'refresh', 
                    invalidated: false 
                },
                transaction: t 
            });
    
            // Update the session log's end time within the same transaction
            await db.SessionLog.update({ endTime: new Date() }, {
                where: { sessionId },
                transaction: t 
            });
    
            // If all updates are successful, commit the transaction
            await t.commit();
        } catch (error) {
            // If an error occurs, rollback all changes
            await t.rollback();
            console.error("Error in invalidateTokenAndSession:", error);
            throw error; // Rethrow the error after rollback
        }
    } */
    


/* // Function to refresh tokens
exports.refreshTokens = async (userId, sessionId) => {
    console.log('Entered refresh tokens function');
    
    const refreshTokenRecord = await Token.findOne({
        where: { userId, sessionId, tokenType: 'refresh', invalidated: false }
    });
    
    try {
        await verifyTokenHelper(refreshTokenRecord.tokenKey);
    } catch (error) {
        await invalidateTokenAndSession(sessionId, userId);
    }
    
    // Invalidate the old refresh token
    await refreshTokenRecord.update({ invalidated: true, lastUsedAt: new Date() });
    
    // Issue new access token
    const newAccessToken = exports.issueAccessToken(userId, sessionId);   
    // Asynchronously handle issuing a new refresh token
    exports.handleRefreshToken(userId, sessionId).catch(err => {
        console.error("Failed to issue a new refresh token asynchronously:", err);
    });

    return { accessToken: newAccessToken };
}; */

