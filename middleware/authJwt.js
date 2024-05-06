const jwt = require('jsonwebtoken');
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

    if (!token) {
        await invalidateTokenAndSession(req.sessionId, req.userId);
        return res.status(403).send({ message: "No token provided! Please log in again." });
    }

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
        
        console.log(err.name);
        if (err.name === 'TokenExpiredError') {
            console.log('Token expired, attempting to refresh...');
            // // if logout just go next
            // if (isLogout) {
            //     console.log('logout');
            //     next();
            // }
            try {
                const newTokens = await exports.refreshTokens(req.userId, req.sessionId, isLogout);
                res.cookie('accessToken', newTokens.accessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV !== 'development',
                    expires: new Date(Date.now() + config.jwtExpiration),
                    sameSite: 'strict'
                });
                req.userId = jwt.decode(newTokens.accessToken).id;
                next();
            } catch (refreshError) {
                return res.status(401).send({ message: refreshError.message });
            }
        } else {
            return res.status(401).send({ message: "Unauthorized!! Token is invalid." });
        }
    }
};


// Invalidate token and update session log
async function invalidateTokenAndSession(sessionId, userId) {
    await Token.update({ invalidated: true }, {
        where: { sessionId, userId, tokenType: 'refresh', invalidated: false }
    });
    await SessionLog.update({ endTime: new Date() }, { where: { sessionId } });
}

// Function to only issue an access token
exports.issueAccessToken = (userId, sessionId) => {
    try {
        const accessToken = jwt.sign({ id: userId, session: sessionId }, config.secret, {
            expiresIn: config.jwtExpiration
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
        const refreshToken = jwt.sign({ id: userId, session: sessionId }, config.secret, {
            expiresIn: config.jwtRefreshExpiration
        });
        console.log("Refresh token signed");
        
        await Token.create({
            tokenKey: refreshToken,
            userId,
            sessionId,
            tokenType: 'refresh',
            expiresAt: new Date(Date.now() + config.jwtRefreshExpiration),
            invalidated: false
        });
        console.log("Refresh token saved to database");
    } catch (error) {
        console.error("Error handling refresh token:", error);
    }
};



// Function to refresh tokens
exports.refreshTokens = async (userId, sessionId, isLogout = false) => {
    console.log('Entered refresh tokens function');
    if (isLogout) {
        console.error("Logout attempt with expired token, not refreshing tokens.");
        // if it's a logout attempt, don't refresh tokens
        return { accessToken: exports.issueAccessToken(userId, sessionId) };
    }

    const refreshTokenRecord = await Token.findOne({
        where: { userId, sessionId, tokenType: 'refresh', invalidated: false }
    });

    if (!refreshTokenRecord) {
        throw new Error("No valid refresh token found.");
    }

    try {
        await verifyTokenHelper(refreshTokenRecord.tokenKey);
    } catch (error) {
        await invalidateTokenAndSession(sessionId, userId);
        throw new Error("Refresh token is invalid or expired. Please log in again.");
    }

    // Invalidate the old refresh token
    await refreshTokenRecord.update({ invalidated: true, lastUsedAt: new Date() });

    // Issue a new access token
    const newAccessToken = exports.issueAccessToken(userId, sessionId);

    // Issue a new refresh token asynchronously
    exports.handleRefreshToken(userId, sessionId).catch(err => {
        console.error("Failed to issue a new refresh token asynchronously:", err);
    });

    return { accessToken: newAccessToken };
};

