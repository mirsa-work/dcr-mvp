/**
 * Branch Controller
 * Handles branch management operations
 */
const db = require('../../../db');
const { ApiError } = require('../../../utils/core');

/**
 * Get all branches
 * - ADMIN / VIEWER: list every branch
 * - BRANCH user: list only their own branch
 */
async function getAllBranches(req, res) {
    try {
        if (req.user.role === 'ADMIN' || req.user.role === 'VIEWER') {
            // Admin and viewer users can see all branches
            const branches = await db.query(
                'SELECT id, code, name FROM branches ORDER BY name'
            );
            return res.json(branches);
        }

        // BRANCH role → single row (their own branch)
        const branches = await db.query(
            'SELECT id, code, name FROM branches WHERE id = ?',
            [req.user.bid] // Using bid shortcut from auth token
        );
        return res.json(branches); // Still an array, length = 1
    } catch (error) {
        throw new ApiError('Failed to load branches', 500);
    }
}

/**
 * Get branch by ID
 */
async function getBranchById(req, res) {
    const { id } = req.params;
    
    const branch = await db.query(
        'SELECT * FROM branches WHERE id = ?',
        [id]
    );
    
    if (!branch.length) {
        throw new ApiError('Branch not found', 404);
    }
    
    res.json(branch[0]);
}

/**
 * Create a new branch
 */
async function createBranch(req, res) {
    const { name, code, address, phone, email } = req.body;
    
    if (!name || !code) {
        throw new ApiError('Branch name and code are required', 400);
    }
    
    // Check if code already exists
    const existing = await db.query(
        'SELECT id FROM branches WHERE code = ?',
        [code]
    );
    
    if (existing.length) {
        throw new ApiError('Branch code already exists', 400);
    }
    
    const result = await db.query(
        'INSERT INTO branches (name, code, address, phone, email) VALUES (?, ?, ?, ?, ?)',
        [name, code, address || null, phone || null, email || null]
    );
    
    res.status(201).json({
        id: result.insertId,
        name,
        code,
        address,
        phone,
        email
    });
}

/**
 * Update a branch
 */
async function updateBranch(req, res) {
    const { id } = req.params;
    const { name, address, phone, email } = req.body;
    
    // Cannot update branch code as it's used as a key identifier
    
    // Check if branch exists
    const branch = await db.query(
        'SELECT id FROM branches WHERE id = ?',
        [id]
    );
    
    if (!branch.length) {
        throw new ApiError('Branch not found', 404);
    }
    
    // Create update query dynamically based on provided fields
    const updateFields = [];
    const params = [];
    
    if (name) {
        updateFields.push('name = ?');
        params.push(name);
    }
    
    if (address !== undefined) {
        updateFields.push('address = ?');
        params.push(address);
    }
    
    if (phone !== undefined) {
        updateFields.push('phone = ?');
        params.push(phone);
    }
    
    if (email !== undefined) {
        updateFields.push('email = ?');
        params.push(email);
    }
    
    if (updateFields.length === 0) {
        return res.json({ message: 'No updates provided' });
    }
    
    // Add ID to params
    params.push(id);
    
    // Update branch
    await db.query(
        `UPDATE branches SET ${updateFields.join(', ')} WHERE id = ?`,
        params
    );
    
    res.json({ success: true });
}

module.exports = {
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch
}; 