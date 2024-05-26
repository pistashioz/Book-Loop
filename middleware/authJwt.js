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
// Verify token middleware
exports.verifyToken = async (req, res, next) => {
    console.log('Cookies:', req.cookies);  // Log cookies to debug
  
    const token = req.cookies.accessToken;
    if (!token) {
      console.log('No access token provided');
      return res.status(403).send({ message: 'Access Token is missing or expired, please refresh token.' });
    }
  
    try {
      const decoded = await verifyTokenHelper(token);
      const session = await SessionLog.findOne({ where: { sessionId: decoded.session, endTime: null } });
      if (!session) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.status(403).send({ message: 'Session has been terminated. Please log in again.' });
      }
      req.userId = decoded.id;
      req.sessionId = decoded.session;
      next();
    } catch (error) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return res.status(401).send({ message: 'Invalid token. Please log in again.' });
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
