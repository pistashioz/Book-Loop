const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');
const config = require('../config/auth.config');
const db = require('../models');
const { Token, SessionLog } = db;
const { verifyTokenHelper } = require('../utils/jwtHelpers');

/**
 * Middleware to verify the validity of access tokens.
 * Adds user and session IDs to the request object if valid.
 */
exports.verifyToken = async (req, res, next) => {
    const token = req.cookies.accessToken;
    if (!token) {
        return res.status(403).send({ message: 'Access Token is missing, please log in again!' });
    }

    try {
        const decoded = await verifyTokenHelper(token);
        const session = await SessionLog.findOne({ where: { sessionId: decoded.session, endTime: null } });
        if (!session) {
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken', { path: '/users/me/refresh' });
            return res.status(403).send({ message: 'Session has been terminated. Please log in again.' });
        }
        req.userId = decoded.id;
        req.sessionId = decoded.session;
        
        // Check if the token needs refresh
        if (decoded.needsRefresh) {
            return res.status(401).send({ message: 'Token nearing expiration. Please refresh token.', refresh: true });
        }

        next();
    } catch (error) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken', { path: '/users/me/refresh' });
        if (error.name === 'TokenExpiredError') {
            console.log('Token has expired. Please refresh token.');
            return res.status(401).send({ message: 'Token has expired. Please refresh token.', refresh: true });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(403).send({ message: 'Invalid token. Please log in again.' });
        }
        return res.status(500).send({ message: 'Failed to authenticate token.' });
    }
};

/**
 * Issues a new access token for a given user and session.
 * Returns an object with the token, its expiry date, and the cookie expiry date.
 */
exports.issueAccessToken = (userId, sessionId) => {
    try {
        const expirationMins = config.jwtExpiration;
        const expirationTime = dayjs().add(expirationMins, 'minute').unix();
        const token = jwt.sign({ id: userId, session: sessionId }, config.secret, {
            expiresIn: expirationTime
        });
        const cookieExpires = new Date(dayjs().add(expirationMins + 5, 'minutes').valueOf());
        return { token, expires: new Date(dayjs().add(expirationMins, 'minutes').valueOf()), cookieExpires };
    } catch (error) {
        console.error("Error issuing access token:", error);
        throw new Error("Failed to issue access token.");
    }
};

/**
 * Handles issuing a new refresh token for a given user and session.
 * Returns the token, its expiry date, and the cookie expiry date.
 */
exports.handleRefreshToken = (userId, sessionId) => {
    try {
        const expirationHours = config.jwtRefreshExpiration;
        const expirationTime = dayjs().add(expirationHours, 'hours').unix();
        const refreshToken = jwt.sign({ id: userId, session: sessionId }, config.secret, {
            expiresIn: expirationTime
        });
        const cookieExpires = new Date(dayjs().add(expirationHours * 60 + 5, 'minutes').valueOf());
        return { refreshToken, expires: new Date(dayjs().add(expirationHours, 'hours').valueOf()), cookieExpires };
    } catch (error) {
        console.error("Error handling refresh token:", error);
        throw new Error("Failed to handle refresh token.");
    }
};
