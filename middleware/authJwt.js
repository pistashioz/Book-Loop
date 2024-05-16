const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');
const config = require('../config/auth.config');
const db = require('../models');
const { Token, SessionLog } = db;

/**
 * Helper function to handle token verification.
 * Verifies the provided token and returns the decoded data.
 * Rejects with detailed error info if verification fails.
 */
async function verifyTokenHelper(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, config.secret, (err, decoded) => {
            if (err) {
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

/**
 * Middleware to verify the validity of access tokens.
 * Adds user and session IDs to the request object if valid.
 */
exports.verifyToken = async (req, res, next) => {
    const accessToken = req.cookies['accessToken'];
    if (!accessToken) {
        return res.status(401).send({ message: "Access Token is missing or expired, please refresh token." });
    }

    try {
        const decoded = await verifyTokenHelper(accessToken);
        
        // Check if the session is still valid
        const session = await SessionLog.findOne({
            where: {
                sessionId: decoded.session,
                endTime: null  // Ensures the session is still active
            }
        });

        if (!session) {
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return res.status(403).send({ message: "Session has been terminated. Please log in again." });
        }

        req.userId = decoded.id;
        req.sessionId = decoded.session;
        next();
    } catch (err) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.status(401).send({ message: "Invalid token. Please log in again." });
    }
};


/**
 * Issues a new access token for a given user and session.
 * Returns an object with the token and its expiry date.
 */
exports.issueAccessToken = (userId, sessionId) => {
    try {
        const expirationMins = config.jwtExpiration;
        const expirationTime = dayjs().add(expirationMins, 'minute').unix();
        const token = jwt.sign({ id: userId, session: sessionId }, config.secret, {
            expiresIn: expirationTime
        });
        return { token, expires: new Date(dayjs().add(expirationMins, 'minutes').valueOf()) };
    } catch (error) {
        console.error("Error issuing access token:", error);
        throw new Error("Failed to issue access token.");
    }
};

/**
 * Asynchronously handles issuing a new refresh token for a given user and session.
 * Does not handle database interactions here; returns the token and its expiry date.
 */
exports.handleRefreshToken = (userId, sessionId) => {
    try {
        const expirationHours = config.jwtRefreshExpiration;
        const expirationTime = dayjs().add(expirationHours, 'hours').unix();
        const refreshToken = jwt.sign({ id: userId, session: sessionId }, config.secret, {
            expiresIn: expirationTime
        });
        return { refreshToken, expires: new Date(dayjs().add(expirationHours, 'hours').valueOf()) };
    } catch (error) {
        console.error("Error handling refresh token:", error);
        throw new Error("Failed to handle refresh token.");
    }
};
