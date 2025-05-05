const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = '8h';               // adjust as needed

/* POST /api/login  {username, password} */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username & password required' });
    }

    try {
        const [rows] = await db.query(
            'SELECT id, username, password AS hash, role, branch_id FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];

        const match = await bcrypt.compare(password, user.hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        /* build a compact payload */
        const payload = {
            id: user.id,
            role: user.role,
            bid: user.branch_id   // “bid” = branch_id shortcut
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });

        res.json({ token, user: { id: user.id, username, role: user.role, branch_id: user.branch_id } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Auth failure' });
    }
});

module.exports = router;
