/**
 * User Controller
 * Handles user management operations
 */
const db = require('../../../db');
const bcrypt = require('bcrypt');
const { ApiError } = require('../../../utils/core');

// Number of salt rounds for bcrypt
const SALT_ROUNDS = 10;

// Function to generate a random password
function generateRandomPassword(length = 8) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
}

/**
 * Get the currently authenticated user
 */
async function getCurrentUser(req, res) {
    const userId = req.user.id;
    
    const user = await db.query(
        'SELECT id, username, role, branch_id FROM users WHERE id = ?',
        [userId]
    );
    
    if (!user.length) {
        throw new ApiError('User not found', 404);
    }
    
    res.json(user[0]);
}

/**
 * Get all users (admin only)
 */
async function getAllUsers(req, res) {
    const users = await db.query(
        'SELECT id, username, role, branch_id FROM users ORDER BY username'
    );
    
    res.json(users);
}

/**
 * Get user by ID (admin only)
 */
async function getUserById(req, res) {
    const { id } = req.params;
    
    const user = await db.query(
        'SELECT id, username, role, branch_id FROM users WHERE id = ?',
        [id]
    );
    
    if (!user.length) {
        throw new ApiError('User not found', 404);
    }
    
    res.json(user[0]);
}

/**
 * Create a new user (admin only)
 */
async function createUser(req, res) {
    const { username, password, role, branchId } = req.body;
    
    if (!username || !password || !role) {
        throw new ApiError('Username, password, and role are required', 400);
    }
    
    // Check if username already exists
    const existing = await db.query(
        'SELECT id FROM users WHERE username = ?',
        [username]
    );
    
    if (existing.length) {
        throw new ApiError('Username already exists', 400);
    }
    
    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        
        // Insert user with hashed password
        const result = await db.query(
            'INSERT INTO users (username, password, role, branch_id) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, role, branchId || null]
        );
        
        res.status(201).json({
            id: result.insertId,
            username,
            role,
            branch_id: branchId
        });
    } catch (error) {
        throw new ApiError('Failed to create user', 500);
    }
}

/**
 * Update a user (admin only)
 */
async function updateUser(req, res) {
    const { id } = req.params;
    const { username, password, role, branchId } = req.body;
    
    // Check if user exists
    const user = await db.query(
        'SELECT id FROM users WHERE id = ?',
        [id]
    );
    
    if (!user.length) {
        throw new ApiError('User not found', 404);
    }
    
    try {
        // Create update query dynamically based on provided fields
        const updateFields = [];
        const params = [];
        
        if (username) {
            updateFields.push('username = ?');
            params.push(username);
        }
        
        if (password) {
            // Hash password if provided
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            updateFields.push('password = ?');
            params.push(hashedPassword);
        }
        
        if (role) {
            updateFields.push('role = ?');
            params.push(role);
        }
        
        if (branchId !== undefined) {
            updateFields.push('branch_id = ?');
            params.push(branchId === null ? null : branchId);
        }
        
        if (updateFields.length === 0) {
            return res.json({ message: 'No updates provided' });
        }
        
        // Add ID to params
        params.push(id);
        
        // Update user
        await db.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );
        
        res.json({ success: true });
    } catch (error) {
        throw new ApiError('Failed to update user', 500);
    }
}

/**
 * Change password for currently logged in user
 */
async function changePassword(req, res) {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        throw new ApiError('Current password and new password are required', 400);
    }
    
    // Check for minimum password length
    if (newPassword.length < 6) {
        throw new ApiError('New password must be at least 6 characters long', 400);
    }
    
    // Get current user with password hash
    const users = await db.query(
        'SELECT id, password AS hash FROM users WHERE id = ?',
        [userId]
    );
    
    if (!users.length) {
        throw new ApiError('User not found', 404);
    }
    
    const user = users[0];
    
    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.hash);
    if (!match) {
        throw new ApiError('Current password is incorrect', 401);
    }
    
    try {
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        
        // Update password
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );
        
        res.json({ 
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        throw new ApiError('Failed to update password', 500);
    }
}

/**
 * Reset password for another user (admin only)
 */
async function resetUserPassword(req, res) {
    const { userId } = req.body;
    
    if (!userId) {
        throw new ApiError('User ID is required', 400);
    }
    
    // Check if user exists
    const users = await db.query(
        'SELECT id, username FROM users WHERE id = ?',
        [userId]
    );
    
    if (!users.length) {
        throw new ApiError('User not found', 404);
    }
    
    const user = users[0];
    
    try {
        // Generate random password
        const randomPassword = generateRandomPassword(10);
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(randomPassword, SALT_ROUNDS);
        
        // Update password
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );
        
        res.json({
            success: true,
            username: user.username,
            newPassword: randomPassword,
            message: 'Password reset successfully'
        });
    } catch (error) {
        throw new ApiError('Failed to reset password', 500);
    }
}

module.exports = {
    getCurrentUser,
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    changePassword,
    resetUserPassword
}; 