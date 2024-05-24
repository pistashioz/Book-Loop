const cron = require('node-cron');
const db = require('../models'); 
const { Token, SessionLog } = db;
const { Op } = require('sequelize');

async function cleanupExpiredTokens() {
    const now = new Date();
    console.log(`Running cleanup at: ${now.toISOString()}`);

    try {
        const tokens = await Token.findAll({
            where: {
                expiresAt: { [Op.lt]: now },
                invalidated: false,
                tokenType: 'refresh'
            }
        });

        console.log(`Found ${tokens.length} tokens to update!!`);

        if (tokens.length > 0) {
            const t = await db.sequelize.transaction();
            try {
                for (let token of tokens) {
                    console.log(`Updating token ${token.tokenKey} and session ${token.sessionId}`);
                    await Token.update(
                        { invalidated: true, lastUsedAt: now },
                        { where: { tokenKey: token.tokenKey }, transaction: t }
                    );
                    await SessionLog.update(
                        { endTime: now },
                        { where: { sessionId: token.sessionId }, transaction: t }
                    );
                }
                await t.commit();
                console.log(`Transaction committed: ${tokens.length} tokens and sessions updated.`);
            } catch (error) {
                await t.rollback();
                console.error("Transaction rolled back due to an error:", error);
            }
        } else {
            console.log("No expired tokens found to update at this check.");
        }
    } catch (error) {
        console.error("Error retrieving tokens for cleanup:", error);
    }
}

// Schedule the token cleanup job to run every hour
 cron.schedule('0 * * * *', cleanupExpiredTokens);

 // cron.schedule('* * * * *', cleanupExpiredTokens); // Schedule the token cleanup job to run every minute
// cron.schedule('*/10 * * * * *', cleanupExpiredTokens);
