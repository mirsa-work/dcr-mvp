const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

/* build JSON spec from relational tables */
router.get('/form-spec', auth, async (req, res) => {
    const bid = +req.query.branchId || req.user.bid;
    /* pick form valid on today; you can add ?date=YYYY-MM-DD later */
    const [[form]] = await db.query(
        `SELECT id FROM forms
      WHERE branch_id=? AND valid_from<=CURDATE()
        AND (valid_to IS NULL OR valid_to>CURDATE())`,
        [bid]
    );
    if (!form) return res.status(404).json({ error: 'No active form' });

    /* groups & fields */
    const [rows] = await db.query(
        `(
    SELECT 
        NULL AS gid, 
        NULL AS group_label, 
        0 AS group_sort_order,
        f.id AS fid, 
        f.key_code, 
        f.label AS field_label, 
        f.data_type,
        f.required, 
        c.code AS customer_code, 
        cat.code AS category_code,
        f.sort_order AS field_sort_order
    FROM form_fields f
    LEFT JOIN customers c ON c.id = f.customer_id
    LEFT JOIN contract_categories cat ON cat.id = f.category_id
    WHERE f.form_id = ? AND f.group_id IS NULL
)
UNION ALL
(
    SELECT 
        g.id AS gid, 
        g.label AS group_label, 
        g.sort_order AS group_sort_order,
        f.id AS fid, 
        f.key_code, 
        f.label AS field_label, 
        f.data_type,
        f.required, 
        c.code AS customer_code, 
        cat.code AS category_code,
        f.sort_order AS field_sort_order
    FROM form_groups g
    JOIN form_fields f ON f.group_id = g.id
    LEFT JOIN customers c ON c.id = f.customer_id
    LEFT JOIN contract_categories cat ON cat.id = f.category_id
    WHERE g.form_id = ?
)
ORDER BY 
    CASE WHEN gid IS NULL THEN 0 ELSE 1 END,
    group_sort_order,
    field_sort_order`, [form.id, form.id]);

    /* build the JSON shape expected by front‑end */
    const groups = [];
    const map = {};
    for (const r of rows) {
        if (!map[r.gid]) {
            map[r.gid] = { label: r.group_label, fields: [] };
            groups.push(map[r.gid]);
        }
        if (r.fid) {
            map[r.gid].fields.push({
                key: r.key_code, label: r.field_label, type: r.data_type,
                required: !!r.required,
                customer_code: r.customer_code || null,
                category_code: r.category_code || null
            });
        }
    }
    res.json({ groups });
});
module.exports = router;
