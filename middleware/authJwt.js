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
        return res.status(403).send({ message: "No token provided! Please log in again." });
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
                        expires: new Date(dayjs().add(30, 'minute').valueOf()), // Converts to appropriate date format
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


    // Invalidate token and update session log
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
    }
    

// Function to only issue an access token
exports.issueAccessToken = (userId, sessionId) => {
    try {
        const expirationTime = dayjs().add(30, 'minute').unix(); // Expires in 30 minutes
        const accessToken = jwt.sign({ id: userId, session: sessionId }, config.secret, {
            expiresIn: expirationTime
        });
        console.log("Access token signed");
        return accessToken;
    } catch (error) {
        console.error("Error issuing access token:", error);
        throw new Error("Failed to issue access token.");
    }
};

// Asynchronously handle refresh token
exports.handleRefreshToken = async (userId, sessionId) => {
    try {
        const expirationTime = dayjs().add(14, 'day').unix(); // Expires in 14 days
        const refreshToken = jwt.sign({ id: userId, session: sessionId }, config.secret, {
            expiresIn: expirationTime
        });
        console.log("Refresh token signed");

        await Token.create({
            tokenKey: refreshToken,
            userId,
            sessionId,
            tokenType: 'refresh',
            expiresAt: new Date(dayjs().add(14, 'day').valueOf()),
            invalidated: false
        });
        console.log("Refresh token saved to database");
    } catch (error) {
        console.error("Error handling refresh token:", error);
    }
};



// Function to refresh tokens
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
};
