const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');

/**
 * Helper function to handle token verification.
 * Verifies the provided token and returns the decoded data.
 * Rejects with detailed error info if verification fails.
 */
async function verifyTokenHelper(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, config.secret, (err, decoded) => {
            if (err) {
/*                 if (err.name === 'TokenExpiredError') {
                    const decodedPayload = jwt.decode(token, { complete: true }); // complete: true to include the header and payload in the decoded payload object
                    reject({ ...err, decodedPayload });  // Include decoded payload in rejection
                } else {
                    reject(err);
                } */
                reject(err);
                console.log('Error verifying token:', err);	
            } else {
                resolve(decoded);
            }
        });
    });
}

module.exports = { verifyTokenHelper };
