const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const branchOk = require('../middleware/branchGuard');
const inWindow = require('../utils/dateWindow');
const makeNo = require('../utils/dcrNumber');
const fieldSpec = require('../config/field-spec.json');

const router = express.Router();

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
        const body = req.body;           // expects { date, field1:…, field2:… }

        /* 1. date window */
        if (!inWindow(body.date, 7))
            return res.status(400).json({ error: 'Date outside 7‑day window' });

        /* 2. load branch code & field spec */
        const [[branchRow]] = await db.query('SELECT code FROM branches WHERE id=?', [branchId]);
        if (!branchRow) return res.status(400).json({ error: 'Unknown branch' });
        const branchCode = branchRow.code;
        const spec = fieldSpec[branchCode] || [];

        /* 3. validate payload */
        const errors = [];
        for (const f of spec) {
            const v = body[f.key];

            if (f.required && (v === undefined || v === null || v === ''))
                errors.push(`${f.label} required`);

            if (f.type === 'decimal' && v !== undefined && !/^\d+(\.\d{1,2})?$/.test(String(v)))
                errors.push(`${f.label} max 2 decimals`);

            if (f.type === 'integer' && v !== undefined && !/^\d+$/.test(String(v)))
                errors.push(`${f.label} must be whole number`);
        }
        if (errors.length) return res.status(422).json({ errors });

        /* 4. start transaction */
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            /* 4.1 insert header */
            const dcrNo = makeNo(branchCode, body.date);
            const [head] = await conn.query(
                `INSERT INTO dcr_header
           (branch_id,dcr_number,dcr_date,status,created_by,updated_by)
         VALUES (?,?,?,?,?,?)`,
                [branchId, dcrNo, body.date, 'DRAFT', req.user.id, req.user.id]
            );
            const dcrId = head.insertId;

            /* 4.2 insert values */
            const vals = spec
                .filter(f => body[f.key] !== undefined && body[f.key] !== '')
                .map(f => [dcrId, f.key, String(body[f.key])]);

            if (vals.length)
                await conn.query(
                    'INSERT INTO dcr_values (dcr_id,field_key,value_text) VALUES ?',
                    [vals]
                );

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
        'SELECT branch_id,status FROM dcr_header WHERE id=?',
        [dcrId]
    );
    if (!h) return res.status(404).json({ error: 'Not found' });
    if (!['DRAFT', 'REJECTED'].includes(h.status))
        return res.status(400).json({ error: 'Cannot edit after submission' });

    /* branch permission */
    if (req.user.role === 'BRANCH' && req.user.bid !== h.branch_id)
        return res.status(403).json({ error: 'Forbidden' });

    /* branch code & spec */
    const [[b]] = await db.query('SELECT code FROM branches WHERE id=?', [h.branch_id]);
    const spec = fieldSpec[b.code] || [];

    /* validation (same as create) */
    const errs = [];
    for (const f of spec) {
        const v = body[f.key];
        if (f.required && (v === undefined || v === null || v === ''))
            errs.push(`${f.label} required`);
        if (f.type === 'decimal' && v !== undefined && !/^\d+(\.\d{1,2})?$/.test(String(v)))
            errs.push(`${f.label} max 2 decimals`);
        if (f.type === 'integer' && v !== undefined && !/^\d+$/.test(String(v)))
            errs.push(`${f.label} must be whole number`);
    }
    if (errs.length) return res.status(422).json({ errors: errs });

    /* transaction */
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        /* 1. update header timestamp */
        await conn.query(
            'UPDATE dcr_header SET updated_by=?, updated_at=NOW() WHERE id=?',
            [req.user.id, dcrId]
        );

        /* 2. replace values (simplest) */
        await conn.query('DELETE FROM dcr_values WHERE dcr_id=?', [dcrId]);
        const vals = spec
            .filter(f => body[f.key] !== undefined && body[f.key] !== '')
            .map(f => [dcrId, f.key, String(body[f.key])]);
        if (vals.length)
            await conn.query(
                'INSERT INTO dcr_values (dcr_id,field_key,value_text) VALUES ?',
                [vals]
            );

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

/* -------------------------------------------------------
 *  TODO: submit / accept / reject / reopen  (Day 4)
 * ------------------------------------------------------- */

module.exports = router;
