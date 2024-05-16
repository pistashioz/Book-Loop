const db = require('../models');
const { User } = db;
const { Op, ValidationError, where } = require('sequelize');
const dayjs = require('dayjs');

// Suspend or unsuspend a user's account
exports.toggleSuspension = async (req, res) => {
    try {
        const { userId } = req.params;
        let { suspensionDate } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admins from suspending or unsuspending other admins
        if (user.isAdmin) {
            return res.status(403).json({ message: 'Cannot suspend or unsuspend an admin user' });
        }

        // Prevent suspension of users scheduled for deletion
        if (user.isActiveStatus === 'to be deleted') {
            return res.status(400).json({ message: 'Cannot suspend a user scheduled for deletion' });
        }

        // Unsuspend if the user is currently suspended
        if (user.isActiveStatus === 'suspended') {
            await user.update({ isActiveStatus: 'active', deletionScheduleDate: null });
            return res.status(200).json({ message: 'User account unsuspended' });
        }

        // Suspend the user
        const today = dayjs();
        const minSuspensionDate = today.add(3, 'day');

        if (!suspensionDate || dayjs(suspensionDate).isBefore(minSuspensionDate)) {
            suspensionDate = minSuspensionDate.format('YYYY-MM-DD');
        }

        await user.update({ isActiveStatus: 'suspended', deletionScheduleDate: suspensionDate });
        res.status(200).json({ message: 'User account suspended' });
    } catch (error) {
        console.error("Error suspending or unsuspending user:", error);
        res.status(500).json({ message: 'Error suspending or unsuspending user', error: error.message });
    }
};


// Get users eligible for deletion
exports.getUsersForDeletion = async (req, res) => {
    try {
        const today = dayjs().toDate();
        console.log(`Today's date: ${today}`);

        const users = await User.findAll({
            where: {
                isActiveStatus: 'to be deleted',
                deletionScheduleDate: { [Op.lte]: today }
            },
            attributes: ['userId', 'username', 'profileImage', 'deletionScheduleDate']
        });

        console.log(`Users for deletion: ${JSON.stringify(users, null, 2)}`);

        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users for deletion:", error);
        res.status(500).json({ message: 'Error fetching users for deletion', error: error.message });
    }
};


// Delete a user's account
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByPk(userId);
        if (!user || user.isActiveStatus !== 'to be deleted' || dayjs(user.deletionScheduleDate).isAfter(dayjs())) {
            return res.status(400).json({ message: 'User not eligible for deletion' });
        }

        // Prevent admins from deleting other admins
        if (user.isAdmin) {
            return res.status(403).json({ message: 'Cannot delete an admin user' });
        }

        await user.destroy();
        res.status(200).json({ message: 'User account deleted' });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};
