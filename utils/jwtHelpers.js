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
                console.log(err.name);	
                reject(err);
                console.log('Error verifying token:', err);	
            } else {
                console.log('Successfully verified token');	
                resolve(decoded);
            }
        });
    });
}

module.exports = { verifyTokenHelper };
