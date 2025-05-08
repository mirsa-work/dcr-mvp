const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

/* GET /api/branches
 * – ADMIN / VIEWER: list every branch
 * – BRANCH user   : list only their own branch
 */
router.get('/branches', auth, async (req, res) => {
    try {
        if (req.user.role === 'ADMIN' || req.user.role === 'VIEWER') {
            const [rows] = await db.query(
                'SELECT id, code, name FROM branches ORDER BY name'
            );
            return res.json(rows);
        }

        // BRANCH role → single row
        const [rows] = await db.query(
            'SELECT id, code, name FROM branches WHERE id = ?',
            [req.user.bid]
        );
        return res.json(rows);          // still an array, length = 1
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB error' });
    }
});

module.exports = router;
