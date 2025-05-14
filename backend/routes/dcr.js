const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const branchOk = require('../middleware/branchGuard');
const inWindow = require('../utils/dateWindow');
const makeNo = require('../utils/dcrNumber');

const router = express.Router();

/* helper: load form + its fields for a given branch & date -------------- */
async function getFormAndFields(conn, branchId, theDate) {
    /* form valid on that date */
    const [[form]] = await conn.query(
        `SELECT id FROM forms
       WHERE branch_id=? AND valid_from<=? AND (valid_to IS NULL OR valid_to>? )
       ORDER BY valid_from DESC LIMIT 1`,
        [branchId, theDate, theDate]);
    if (!form) return null;

    /* fields for validation */
    const [rows] = await conn.query(
        `SELECT id,key_code,label,data_type,required
       FROM form_fields
      WHERE form_id=?`, [form.id]);

    return { formId: form.id, fields: rows };
}

/* helper: fetch header + branch / status checks */
async function loadHeader(conn, dcrId) {
    const [[h]] = await conn.query(
        `SELECT dh.*, b.code AS branch_code
         FROM dcr_header dh
         JOIN branches b ON b.id = dh.branch_id
        WHERE dh.id=?`, [dcrId]);
    return h;      // undefined if not found
}

/* -------------------------------------------------------
 *  LIST  (GET /api/branches/:branchId/dcr?month=yyyy-mm)
 * ------------------------------------------------------- */
router.get(
    '/branches/:branchId/dcr',
    auth,
    branchOk('branchId'),
    async (req, res) => {
        const branchId = +req.params.branchId;
        const monthStr = req.query.month || new Date().toISOString().slice(0, 7);

        try {
            const [rows] = await db.query(
                `SELECT id,dcr_number,dcr_date,status
           FROM dcr_header
          WHERE branch_id = ?
            AND DATE_FORMAT(dcr_date,'%Y-%m') = ?
          ORDER BY dcr_date DESC`,
                [branchId, monthStr]
            );
            res.json(rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'DB error' });
        }
    }
);

/* -------------------------------------------------------
 *  CREATE  (POST /api/branches/:branchId/dcr)
 *  Status = DRAFT   — now wrapped in a transaction
 * ------------------------------------------------------- */
router.post(
    '/branches/:branchId/dcr',
    auth,
    branchOk('branchId'),
    async (req, res) => {
        const branchId = +req.params.branchId;
        const body = req.body;

        /* 1. date window */
        if (!inWindow(body.date, 365)) //TODO: Revert to 7
            return res.status(400).json({ error: 'Date outside 7-day window' });

        /* 2. load relational spec */
        const conn = await db.getConnection();

        const [[branchRow]] = await db.query('SELECT code FROM branches WHERE id=?', [branchId]);
        if (!branchRow) return res.status(400).json({ error: 'Unknown branch' });
        const branchCode = branchRow.code;

        const specObj = await getFormAndFields(conn, branchId, body.date);
        if (!specObj) return res.status(400).json({ error: 'No active form for date' });
        const { formId, fields: spec } = specObj;

        /* 3. validate payload */
        const errors = [];
        for (const f of spec) {
            const v = body[f.key_code];

            const isEmpty = v === undefined || v === null || v === '';

            if (f.required && isEmpty)
                errors.push(`${f.label} required`);

            if (f.type === 'decimal' && !isEmpty && !/^\d+(\.\d{1,2})?$/.test(String(v)))
                errors.push(`${f.label} max 2 decimals`);

            if (f.type === 'integer' && !isEmpty && !/^\d+$/.test(String(v)))
                errors.push(`${f.label} must be whole number`);
        }
        if (errors.length) return res.status(422).json({ errors });

        /* 4. start transaction */
        try {
            await conn.beginTransaction();

            /* duplicate‑per‑day guard */
            const [[dup]] = await conn.query(
                'SELECT id FROM dcr_header WHERE branch_id=? AND dcr_date=?',
                [branchId, body.date]
            );
            if (dup) {
                return res.status(409).json({ error: 'A DCR already exists for this date' });
            }

            /* 4.1 insert header */
            const dcrNo = makeNo(branchCode, body.date);
            const [head] = await conn.query(
                `INSERT INTO dcr_header
      (branch_id,form_id,dcr_number,dcr_date,status,created_by,updated_by)
    VALUES (?,?,?,?,?,?,?)`,
                [branchId, formId, dcrNo, body.date, 'DRAFT', req.user.id, req.user.id]);
            const dcrId = head.insertId;

            /* 4.2 insert values */
            const vals = spec
                .filter(f => f.key_code !== 'date' && body[f.key_code] !== undefined && body[f.key_code] !== '')
                .map(f => [dcrId, f.id, body[f.key_code]]);

            if (vals.length)
                await conn.query(
                    'INSERT INTO dcr_values (dcr_id,field_id,value_num) VALUES ?', [vals]);

            await conn.commit();
            res.status(201).json({ id: dcrId, dcr_number: dcrNo, status: 'DRAFT' });
        } catch (err) {
            await conn.rollback();
            console.error(err);
            res.status(500).json({ error: 'Save failed — transaction rolled back' });
        } finally {
            conn.release();
        }
    }
);

/* -------------------------------------------------------
 *  UPDATE (PUT /api/dcr/:id)  — DRAFT / REJECTED only
 *  Also wrapped in a transaction
 * ------------------------------------------------------- */
router.put('/dcr/:id', auth, async (req, res) => {
    const dcrId = +req.params.id;
    const body = req.body;               // new field values

    /* fetch header */
    const [[h]] = await db.query(
        'SELECT branch_id,dcr_number,dcr_date,status FROM dcr_header WHERE id=?',
        [dcrId]
    );
    if (!h) return res.status(404).json({ error: 'Not found' });
    if (!['DRAFT', 'REJECTED'].includes(h.status))
        return res.status(400).json({ error: 'Cannot edit after submission' });

    /* branch permission */
    if (req.user.role === 'BRANCH' && req.user.bid !== h.branch_id)
        return res.status(403).json({ error: 'Forbidden' });

    /* branch code & spec */
    const conn = await db.getConnection();
    const specObj = await getFormAndFields(conn, h.branch_id, body.date);
    if (!specObj) return res.status(400).json({ error: 'No form for date' });
    const { formId, fields: spec } = specObj;

    /* validation (same as create) */
    const errs = [];
    for (const f of spec) {
        const v = body[f.key_code];

        const isEmpty = v === undefined || v === null || v === '';

        if (f.required && isEmpty)
            errs.push(`${f.label} required`);
        if (f.type === 'decimal' && !isEmpty && !/^\d+(\.\d{1,2})?$/.test(String(v)))
            errs.push(`${f.label} max 2 decimals`);
        if (f.type === 'integer' && !isEmpty && !/^\d+$/.test(String(v)))
            errs.push(`${f.label} must be whole number`);
    }
    if (errs.length) return res.status(422).json({ errors: errs });

    // if date changed → regenerate dcr_number
    let newDcrNo = h.dcr_number;
    if (body.date !== h.dcr_date.toISOString().slice(0, 10)) {

        const [[branchRow]] = await db.query('SELECT code FROM branches WHERE id=?', [branchId]);
        if (!branchRow) return res.status(400).json({ error: 'Unknown branch' });
        const branchCode = branchRow.code;

        newDcrNo = makeNo(branchCode, body.date);
    }

    /* transaction */
    try {
        await conn.beginTransaction();

        /*  check duplicate date, ignoring this row itself  */
        const [[dup]] = await conn.query(
            `SELECT id FROM dcr_header
           WHERE branch_id = ?
             AND dcr_date  = ?
             AND id <> ?`,
            [h.branch_id, body.date, dcrId]
        );
        if (dup) {
            return res.status(409).json({ error: 'Another DCR already exists for this date' });
        }

        /* 1. update header timestamp */
        await conn.query(
            `UPDATE dcr_header
                SET updated_by=?, updated_at=NOW(),
                    dcr_date=?, dcr_number=?
              WHERE id=?`,
            [req.user.id, body.date, newDcrNo, dcrId]
        );

        /* 2. replace values (simplest) */
        await conn.query('DELETE FROM dcr_values WHERE dcr_id=?', [dcrId]);
        const vals = spec
            .filter(f => f.key_code !== 'date' && body[f.key_code] !== undefined && body[f.key_code] !== '')
            .map(f => [dcrId, f.id, body[f.key_code]]);
        if (vals.length)
            await conn.query('INSERT INTO dcr_values (dcr_id,field_id,value_num) VALUES ?', [vals]);

        await conn.commit();
        res.json({ ok: true });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Update failed — rolled back' });
    } finally {
        conn.release();
    }
});

router.post('/dcr/:id/submit', auth, async (req, res) => {
    const dcrId = +req.params.id;
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const h = await loadHeader(conn, dcrId);
        if (!h) return res.status(404).json({ error: 'Not found' });

        /* permission */
        if (req.user.role === 'BRANCH' && req.user.id !== h.created_by)
            return res.status(403).json({ error: 'Forbidden' });
        if (!['DRAFT', 'REJECTED'].includes(h.status))
            return res.status(400).json({ error: 'Already submitted' });

        await conn.query(
            `UPDATE dcr_header SET status='SUBMITTED', updated_by=? WHERE id=?`,
            [req.user.id, dcrId]
        );
        await conn.commit();
        res.json({ status: 'SUBMITTED' });
    } catch (e) { await conn.rollback(); res.status(500).json({ error: 'fail' }); }
    finally { conn.release(); }
});

router.post('/dcr/:id/accept', auth, role('ADMIN'), async (req, res) => {
    const dcrId = +req.params.id;
    await db.query(
        `UPDATE dcr_header
          SET status='ACCEPTED', reject_reason=NULL, updated_by=? 
        WHERE id=? AND status='SUBMITTED'`,
        [req.user.id, dcrId]
    );
    res.json({ status: 'ACCEPTED' });
});

router.post('/dcr/:id/reject', auth, role('ADMIN'), async (req, res) => {
    const { reason } = req.body;          // expect { reason:"…" }
    const dcrId = +req.params.id;
    await db.query(
        `UPDATE dcr_header
          SET status='REJECTED', reject_reason=?, updated_by=?
        WHERE id=? AND status IN ('SUBMITTED','ACCEPTED')`,
        [reason || null, req.user.id, dcrId]
    );
    res.json({ status: 'REJECTED' });
});

router.post('/dcr/:id/reopen', auth, role('ADMIN'), async (req, res) => {
    const dcrId = +req.params.id;
    await db.query(
        `UPDATE dcr_header SET status='REJECTED', updated_by=? WHERE id=? AND status='ACCEPTED'`,
        [req.user.id, dcrId]
    );
    res.json({ status: 'REJECTED' });
});

/* -------------------------------------------------------
 *  GET one DCR  (used for Edit modal)
 * ------------------------------------------------------- */
router.get('/dcr/:id', auth, async (req, res) => {
    const dcrId = +req.params.id;

    /* 1. header with branch check */
    const [[h]] = await db.query(
        `SELECT id, branch_id, status, dcr_date
         FROM dcr_header WHERE id = ?`, [dcrId]);
    if (!h) return res.status(404).json({ error: 'Not found' });

    if (req.user.role === 'BRANCH' && req.user.bid !== h.branch_id)
        return res.status(403).json({ error: 'Forbidden' });

    /* 2. values */
    const [vals] = await db.query(
        `SELECT f.key_code AS k, v.value_num AS val
     FROM dcr_values v
     JOIN form_fields f ON f.id=v.field_id
    WHERE v.dcr_id=?`, [dcrId]);

    const obj = Object.fromEntries(vals.map(v => [v.k, v.val]));
    obj.date = h.dcr_date;          // include date for the date input
    res.json(obj);
});

module.exports = router;
