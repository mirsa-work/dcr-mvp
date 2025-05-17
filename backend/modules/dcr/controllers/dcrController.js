/**
 * DCR Controller
 * Handles business logic for DCR operations
 */
const db = require('../../../db');
const { ApiError } = require('../../../utils/core');
const { generateDcrNumber } = require('../../../utils/dcrNumber');

// Import services if they exist
// const dcrService = require('../services/dcrService');

/**
 * Get a single DCR by ID
 */
async function getDcr(req, res) {
    const { id } = req.params;
    
    const dcr = await db.query(
        'SELECT * FROM dcr_header WHERE id = ?',
        [id]
    );
    
    if (!dcr || dcr.length === 0) {
        throw new ApiError('DCR not found', 404);
    }
    
    // Get field values
    const values = await db.query(
        'SELECT field_id, value_num FROM dcr_values WHERE dcr_id = ?',
        [id]
    );
    
    // Combine header with field values
    const result = {
        ...dcr[0],
        values: values || []
    };
    
    return res.json(result);
}

/**
 * Create a new DCR for a branch
 */
async function createDcr(req, res) {
    const { branchId } = req.params;
    const dcrData = req.body;
    
    // Ensure we have a date
    if (!dcrData.date) {
        throw new ApiError('DCR date is required', 400);
    }
    
    // Ensure user information is available
    if (!req.user || !req.user.id) {
        throw new ApiError('User information not available', 400);
    }
    
    // Generate DCR number
    const dcrNumber = await generateDcrNumber(branchId);
    
    // Start transaction
    const conn = await db.beginTransaction();
    
    try {
        // Get the current form for this branch
        const formQuery = await db.transactionQuery(
            conn,
            `SELECT id FROM forms 
             WHERE branch_id = ? AND valid_from <= CURDATE()
             AND (valid_to IS NULL OR valid_to > CURDATE())`,
            [branchId]
        );
        
        if (!formQuery || formQuery.length === 0) {
            throw new ApiError('No active form found for this branch', 404);
        }
        
        const formId = formQuery[0].id;
        
        // Insert DCR header
        const result = await db.transactionQuery(
            conn,
            `INSERT INTO dcr_header 
             (branch_id, form_id, dcr_number, dcr_date, status, created_by, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [branchId, formId, dcrNumber, dcrData.date, 'DRAFT', req.user.id]
        );
        
        const dcrId = result.insertId;
        
        // Insert DCR values
        if (dcrData) {
            const valueEntries = [];
            
            // Process field values
            for (const [key, value] of Object.entries(dcrData)) {
                // Skip date field as it's already in the header
                if (key === 'date') continue;
                
                // Get field ID from form_fields
                const fieldQuery = await db.transactionQuery(
                    conn,
                    'SELECT id FROM form_fields WHERE form_id = ? AND key_code = ?',
                    [formId, key]
                );
                
                if (fieldQuery && fieldQuery.length > 0) {
                    const fieldId = fieldQuery[0].id;
                    
                    // Convert empty string or non-numeric values to 0
                    let numericValue = value;
                    if (value === '' || value === null || value === undefined || isNaN(parseFloat(value))) {
                        numericValue = 0;
                    } else {
                        numericValue = parseFloat(value);
                    }
                    
                    valueEntries.push([dcrId, fieldId, numericValue]);
                }
            }
            
            // Insert values if we have any
            if (valueEntries.length > 0) {
                // Use individual inserts instead of bulk insert
                for (const [dcrId, fieldId, value] of valueEntries) {
                    await db.transactionQuery(
                        conn,
                        'INSERT INTO dcr_values (dcr_id, field_id, value_num) VALUES (?, ?, ?)',
                        [dcrId, fieldId, value]
                    );
                }
            }
        }
        
        // Commit transaction
        await db.commitTransaction(conn);
        
        res.status(201).json({ id: dcrId, dcrNumber });
    } catch (error) {
        // Rollback transaction on error
        await db.rollbackTransaction(conn);
        throw error;
    }
}

/**
 * Get DCRs for a branch
 */
async function getDcrsByBranch(req, res) {
    const { branchId } = req.params;
    const { month } = req.query;
    
    // If month is provided, filter by month
    let query = 'SELECT * FROM dcr_header WHERE branch_id = ?';
    let params = [branchId];
    
    if (month) {
        query += ' AND DATE_FORMAT(dcr_date, "%Y-%m") = ?';
        params.push(month);
    }
    
    query += ' ORDER BY dcr_date DESC';
    
    const dcrs = await db.query(query, params);
    
    return res.json(dcrs || []);
}

/**
 * Update a DCR
 */
async function updateDcr(req, res) {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!req.user || !req.user.bid) {
        throw new ApiError('User branch not available', 400);
    }
    
    // Check if DCR exists and belongs to user's branch (bid = branchId in JWT)
    const dcr = await db.query(
        'SELECT * FROM dcr_header WHERE id = ? AND branch_id = ?',
        [id, req.user.bid]
    );
    
    if (!dcr || dcr.length === 0) {
        throw new ApiError('DCR not found or access denied', 404);
    }
    
    if (!['DRAFT', 'REJECTED'].includes(dcr[0].status)) {
        throw new ApiError('Cannot update DCR in current status', 400);
    }
    
    // Start transaction
    const conn = await db.beginTransaction();
    
    try {
        // Get the form_id from the DCR
        const formId = dcr[0].form_id;
        
        // Update date if provided
        if (updateData.date) {
            await db.transactionQuery(
                conn,
                'UPDATE dcr_header SET dcr_date = ?, updated_at = NOW(), updated_by = ? WHERE id = ?',
                [updateData.date, req.user.id, id]
            );
            
            // Remove date to avoid processing it in field values
            delete updateData.date;
        }
        
        // Update field values
        for (const [key, value] of Object.entries(updateData)) {
            // Get field ID
            const fieldQuery = await db.transactionQuery(
                conn,
                'SELECT id FROM form_fields WHERE form_id = ? AND key_code = ?',
                [formId, key]
            );
            
            if (fieldQuery && fieldQuery.length > 0) {
                const fieldId = fieldQuery[0].id;
                
                // Convert empty string or non-numeric values to 0
                let numericValue = value;
                if (value === '' || value === null || value === undefined || isNaN(parseFloat(value))) {
                    numericValue = 0;
                } else {
                    numericValue = parseFloat(value);
                }
                
                // Update or insert value
                await db.transactionQuery(
                    conn,
                    `INSERT INTO dcr_values (dcr_id, field_id, value_num) 
                     VALUES (?, ?, ?) 
                     ON DUPLICATE KEY UPDATE value_num = VALUES(value_num)`,
                    [id, fieldId, numericValue]
                );
            }
        }
        
        // Update updated_at timestamp
        await db.transactionQuery(
            conn,
            'UPDATE dcr_header SET updated_at = NOW(), updated_by = ? WHERE id = ?',
            [req.user.id, id]
        );
        
        // Commit transaction
        await db.commitTransaction(conn);
        
        res.json({ success: true });
    } catch (error) {
        // Rollback transaction on error
        await db.rollbackTransaction(conn);
        throw error;
    }
}

/**
 * Submit a DCR for approval
 */
async function submitDcr(req, res) {
    const { id } = req.params;
    
    if (!req.user || !req.user.bid) {
        throw new ApiError('User branch not available', 400);
    }
    
    // Check if DCR exists and belongs to user's branch (bid = branchId in JWT)
    const dcr = await db.query(
        'SELECT * FROM dcr_header WHERE id = ? AND branch_id = ?',
        [id, req.user.bid] 
    );
    
    if (!dcr || dcr.length === 0) {
        throw new ApiError('DCR not found or access denied', 404);
    }
    
    if (!['DRAFT', 'REJECTED'].includes(dcr[0].status)) {
        throw new ApiError('Cannot submit DCR in current status', 400);
    }
    
    // Update DCR status
    await db.query(
        'UPDATE dcr_header SET status = ?, updated_at = NOW(), updated_by = ? WHERE id = ?',
        ['SUBMITTED', req.user.id, id]
    );
    
    res.json({ success: true });
}

/**
 * Accept a submitted DCR
 */
async function acceptDcr(req, res) {
    const { id } = req.params;
    
    // Ensure user information is available
    if (!req.user || !req.user.id) {
        throw new ApiError('User information not available', 400);
    }
    
    // Check if DCR exists
    const dcr = await db.query(
        'SELECT * FROM dcr_header WHERE id = ?',
        [id]
    );
    
    if (!dcr || dcr.length === 0) {
        throw new ApiError('DCR not found', 404);
    }
    
    if (dcr[0].status !== 'SUBMITTED') {
        throw new ApiError('Cannot accept DCR in current status', 400);
    }
    
    // Update DCR status
    await db.query(
        'UPDATE dcr_header SET status = ?, updated_at = NOW(), updated_by = ? WHERE id = ?',
        ['ACCEPTED', req.user.id, id]
    );
    
    res.json({ success: true });
}

/**
 * Reject a submitted DCR
 */
async function rejectDcr(req, res) {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
        throw new ApiError('Rejection reason is required', 400);
    }
    
    // Ensure user information is available
    if (!req.user || !req.user.id) {
        throw new ApiError('User information not available', 400);
    }
    
    // Check if DCR exists
    const dcr = await db.query(
        'SELECT * FROM dcr_header WHERE id = ?',
        [id]
    );
    
    if (!dcr || dcr.length === 0) {
        throw new ApiError('DCR not found', 404);
    }
    
    if (dcr[0].status !== 'SUBMITTED') {
        throw new ApiError('Cannot reject DCR in current status', 400);
    }
    
    // Update DCR status
    await db.query(
        'UPDATE dcr_header SET status = ?, reject_reason = ?, updated_at = NOW(), updated_by = ? WHERE id = ?',
        ['REJECTED', reason, req.user.id, id]
    );
    
    res.json({ success: true });
}

/**
 * Reopen an accepted DCR
 */
async function reopenDcr(req, res) {
    const { id } = req.params;
    
    // Ensure user information is available
    if (!req.user || !req.user.id) {
        throw new ApiError('User information not available', 400);
    }
    
    // Check if DCR exists
    const dcr = await db.query(
        'SELECT * FROM dcr_header WHERE id = ?',
        [id]
    );
    
    if (!dcr || dcr.length === 0) {
        throw new ApiError('DCR not found', 404);
    }
    
    if (dcr[0].status !== 'ACCEPTED') {
        throw new ApiError('Cannot reopen DCR in current status', 400);
    }
    
    // Update DCR status
    await db.query(
        'UPDATE dcr_header SET status = ?, updated_at = NOW(), updated_by = ? WHERE id = ?',
        ['SUBMITTED', req.user.id, id]
    );
    
    res.json({ success: true });
}

module.exports = {
    getDcr,
    createDcr,
    getDcrsByBranch,
    updateDcr,
    submitDcr,
    acceptDcr,
    rejectDcr,
    reopenDcr
}; 