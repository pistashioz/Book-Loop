const cron = require('node-cron');
const dayjs = require('dayjs');
const db = require('../models'); 
const { User } = db;
const { Op } = require('sequelize');

async function cleanupSuspensions() {
    const now = dayjs().startOf('day').toDate();
    console.log(`Running suspension cleanup at: ${dayjs().toISOString()}`);

    try {
        const usersToUnsuspend = await User.findAll({
            where: {
                isActiveStatus: 'suspended',
                deletionScheduleDate: { [Op.lte]: now }
            }
        });

        if (usersToUnsuspend.length > 0) {
            const t = await db.sequelize.transaction();
            try {
                for (let user of usersToUnsuspend) {
                    await user.update({ isActiveStatus: 'active', deletionScheduleDate: null }, { transaction: t });
                }
                await t.commit();
                console.log(`Unsuspended ${usersToUnsuspend.length} users.`);
            } catch (error) {
                await t.rollback();
                console.error("Transaction rolled back due to an error:", error);
            }
        } else {
            console.log("No users found to unsuspend at this check.");
        }
    } catch (error) {
        console.error("Error retrieving users for suspension cleanup:", error);
    }
}

if (process.env.NODE_ENV !== 'test') {
    cron.schedule('0 0 * * *', cleanupSuspensions);
}
