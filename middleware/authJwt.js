const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');
const db = require('../models');
const { Token, SessionLog } = db;

// Helper function to handle token verification
async function verifyTokenHelper(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, config.secret, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
}

// Middleware to verify token validity
exports.verifyToken = async (req, res, next) => {
    const token = req.cookies['accessToken']; // Read token from cookie
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
        if (err.name === 'TokenExpiredError') {
            // Attempt to refresh the token
            try {
                const newTokens = await exports.refreshTokens(req.userId, req.sessionId);
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
            return res.status(401).send({ message: "Unauthorized! Token is invalid." });
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

// Function to issue new JWTs
exports.issueJWT = async (userId, sessionId) => {
    const accessToken = jwt.sign({ id: userId, session: sessionId }, config.secret, {
        expiresIn: config.jwtExpiration
    });
    const refreshToken = jwt.sign({ id: userId, session: sessionId }, config.secret, {
        expiresIn: config.jwtRefreshExpiration
    });

    await Token.create({
        tokenKey: refreshToken,
        userId,
        sessionId,
        tokenType: 'refresh',
        expiresAt: new Date(Date.now() + config.jwtRefreshExpiration),
        invalidated: false
    });

    return { accessToken, refreshToken };
};

// Function to refresh tokens
exports.refreshTokens = async (userId, sessionId) => {
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

    await refreshTokenRecord.update({ invalidated: true });
    return exports.issueJWT(userId, sessionId);
};
