const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration); 
const config = require('../config/auth.config');
const db = require('../models');
const { Token, SessionLog } = db;
const { verifyTokenHelper } = require('../utils/jwtHelpers');

exports.verifyToken = async (req, res, next) => {
    const token = req.cookies.accessToken;

    if (!token) {
        return res.status(401).send({ refresh: true });
    }

    try {

        const decoded = await verifyTokenHelper(token);
        const session = await SessionLog.findOne({ where: { sessionId: decoded.session, endTime: null } });
        if (!session) {
            console.log('Invalid session.');
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken', { path: '/users/me/refresh' });
            return res.status(403).send({ redirectTo: '/login' });
        }
        req.userId = decoded.id;
        req.sessionId = decoded.session;

        if (decoded.needsRefresh) {
            console.log('Access token has expired.');
            return res.status(401).send({ refresh: true });
        }

        next();
    } catch (error) {
        console.log(`Error decoding access token: ${error.message}`);
        if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
            return res.status(401).send({ refresh: true });
        }

        console.log('Returning 500 error due to authentication failure.');
        return res.status(500).send({ message: 'Failed to authenticate token.' });
    }
};

// Function to issue access token
exports.issueAccessToken = (userId, sessionId) => {
    try {
        const expirationMins = config.jwtExpiration;
        console.log(`The expiration time for the access token is ${expirationMins} minutes.`);
        const expirationSeconds = dayjs.duration({ minutes: expirationMins }).asSeconds();
        
        console.log(`The expiration time for the access token is ${expirationSeconds} seconds.`);
        
        const token = jwt.sign({ id: userId, session: sessionId }, config.secret, {
            expiresIn: expirationSeconds
        });
        
        const cookieExpires = dayjs().add(expirationMins + 5, 'minutes').toDate();
        
        return { 
            token, 
            cookieExpires 
        };
    } catch (error) {
        console.error("Error issuing access token:", error);
        throw new Error("Failed to issue access token.");
    }
};

// Function to handle refresh token
exports.handleRefreshToken = (userId, sessionId) => {
    try {
        const expirationHours = Number(config.jwtRefreshExpiration);
        const expirationSeconds = dayjs.duration({ hours: expirationHours }).asSeconds();
        
        console.log(`The expiration time for the refresh token is ${expirationSeconds} seconds.`);
        
        const refreshToken = jwt.sign({ id: userId, session: sessionId }, config.secret, {
            expiresIn: expirationSeconds
        });
        
        // Set cookie expiration to 1 hour and 5 minutes (1 hour for the token + 5 additional minutes)
        const cookieExpires = dayjs().add(expirationHours, 'hours').add(5, 'minutes').toDate();
        
        return { 
            refreshToken, 
            expires: dayjs().add(expirationHours, 'hours').toDate(), 
            cookieExpires 
        };
    } catch (error) {
        console.error("Error handling refresh token:", error);
        throw new Error("Failed to handle refresh token.");
    }
};
