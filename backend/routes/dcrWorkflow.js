const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');

const router = express.Router();

/* Helper: fetch header + branch */
async function findDcr(id) {
    const [[row]] = await db.query(
        `SELECT h.*, b.code AS branch_code
       FROM dcr_header h
       JOIN branches b ON b.id = h.branch_id
      WHERE h.id = ?`,
        [id]
    );
    return row;
}

/* ----------------  SUBMIT  ----------------
 *  Branch user → SUBMITTED
 * ----------------------------------------- */
router.post('/dcr/:id/submit', auth, role('BRANCH'), async (req, res) => {
    const dcrId = +req.params.id;
    const dcr = await findDcr(dcrId);

    if (!dcr) return res.status(404).json({ error: 'Not found' });
    if (dcr.status !== 'DRAFT' && dcr.status !== 'REJECTED')
        return res.status(400).json({ error: 'Cannot submit from current status' });
    if (req.user.bid !== dcr.branch_id)
        return res.status(403).json({ error: 'Forbidden' });

    await db.query(
        'UPDATE dcr_header SET status="SUBMITTED", updated_by=?, updated_at=NOW() WHERE id=?',
        [req.user.id, dcrId]
    );
    res.json({ status: 'SUBMITTED' });
});

/* ----------------  ACCEPT  ----------------
 *  Admin → ACCEPTED
 * ----------------------------------------- */
router.post('/dcr/:id/accept', auth, role('ADMIN'), async (req, res) => {
    const dcrId = +req.params.id;
    const dcr = await findDcr(dcrId);
    if (!dcr) return res.status(404).json({ error: 'Not found' });
    if (dcr.status !== 'SUBMITTED')
        return res.status(400).json({ error: 'Only SUBMITTED DCR can be accepted' });

    await db.query(
        'UPDATE dcr_header SET status="ACCEPTED", reject_reason=NULL, updated_by=?, updated_at=NOW() WHERE id=?',
        [req.user.id, dcrId]
    );
    res.json({ status: 'ACCEPTED' });
});

/* ----------------  REJECT  ----------------
 *  Admin → REJECTED (needs reason)
 * ----------------------------------------- */
router.post('/dcr/:id/reject', auth, role('ADMIN'), async (req, res) => {
    const dcrId = +req.params.id;
    const reason = (req.body.reason || '').substring(0, 255).trim();
    if (!reason) return res.status(400).json({ error: 'Reject reason required' });

    const dcr = await findDcr(dcrId);
    if (!dcr) return res.status(404).json({ error: 'Not found' });
    if (dcr.status !== 'SUBMITTED' && dcr.status !== 'ACCEPTED')
        return res.status(400).json({ error: 'Cannot reject from current status' });

    await db.query(
        'UPDATE dcr_header SET status="REJECTED", reject_reason=?, updated_by=?, updated_at=NOW() WHERE id=?',
        [reason, req.user.id, dcrId]
    );
    res.json({ status: 'REJECTED' });
});

/* ----------------  RE‑OPEN  ----------------
 *  Admin: ACCEPTED → REJECTED
 * ----------------------------------------- */
router.post('/dcr/:id/reopen', auth, role('ADMIN'), async (req, res) => {
    const dcrId = +req.params.id;
    const dcr = await findDcr(dcrId);
    if (!dcr) return res.status(404).json({ error: 'Not found' });
    if (dcr.status !== 'ACCEPTED')
        return res.status(400).json({ error: 'Only ACCEPTED DCR can be re‑opened' });

    await db.query(
        'UPDATE dcr_header SET status="REJECTED", reject_reason="Re‑opened by admin", updated_by=?, updated_at=NOW() WHERE id=?',
        [req.user.id, dcrId]
    );
    res.json({ status: 'REJECTED' });
});

module.exports = router;