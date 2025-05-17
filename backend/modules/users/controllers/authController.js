/**
 * Auth Controller
 * Handles authentication logic
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../../../db');
const { ApiError } = require('../../../utils/core');

/**
 * Login user and return JWT token
 */
async function login(req, res) {
    const { username, password } = req.body;
    
    if (!username || !password) {
        throw new ApiError('Username and password are required', 400);
    }
    
    // Get user with password hash
    const users = await db.query(
        'SELECT id, username, password AS hash, role, branch_id FROM users WHERE username = ?',
        [username]
    );
    
    if (!users.length) {
        throw new ApiError('Invalid credentials', 401);
    }
    
    const user = users[0];
    
    // Compare password with hash
    const match = await bcrypt.compare(password, user.hash);
    if (!match) {
        throw new ApiError('Invalid credentials', 401);
    }
    
    // Create JWT token with compact payload
    const payload = {
        id: user.id,
        role: user.role,
        bid: user.branch_id   // "bid" = branch_id shortcut
    };
    
    const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'yoursecretkey',
        { expiresIn: process.env.TOKEN_TTL || '24h' }
    );
    
    // Return user info and token
    res.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            branch_id: user.branch_id
        }
    });
}

module.exports = {
    login
}; 