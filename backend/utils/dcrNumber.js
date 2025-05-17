const db = require('../db');

/**
 * Generate a formatted DCR number
 * @param {string} branchCode Branch code
 * @param {string|Date} dateStr Date string or Date object
 * @param {string} useYear Format of year (YY, YYYY, or empty)
 * @returns {string} Formatted DCR number
 */
function makeDcrNo(branchCode, dateStr, useYear = 'YYYY') {
    const d = new Date(dateStr);
    const yy = String(d.getUTCFullYear()).slice(-2);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const yearPart = useYear === 'YY' ? yy : (useYear === 'YYYY' ? yyyy : '');
    return yearPart
        ? `DCR/${branchCode}/${yearPart}/${mm}/${dd}`
        : `DCR/${branchCode}/${mm}/${dd}`;
}

/**
 * Generate a DCR number for a new DCR
 * @param {number} branchId Branch ID
 * @returns {Promise<string>} DCR number
 */
async function generateDcrNumber(branchId) {
    // Get branch code
    const branch = await db.query('SELECT code FROM branches WHERE id = ?', [branchId]);
    
    if (!branch || branch.length === 0) {
        throw new Error('Branch not found');
    }
    
    const branchCode = branch[0].code;
    const today = new Date();
    
    // Check if DCR exists for this branch and date
    const existingDcr = await db.query(
        'SELECT MAX(dcr_number) as last_dcr FROM dcr_header WHERE branch_id = ? AND DATE(dcr_date) = DATE(?)',
        [branchId, today]
    );
    
    // If exists, append sequence number
    if (existingDcr && existingDcr[0] && existingDcr[0].last_dcr) {
        const lastDcrNo = existingDcr[0].last_dcr;
        const parts = lastDcrNo.split('-');
        
        if (parts.length > 1) {
            // Extract seq number and increment
            const seq = parseInt(parts[parts.length - 1], 10) + 1;
            return `${makeDcrNo(branchCode, today)}-${seq}`;
        } else {
            // First seq number
            return `${makeDcrNo(branchCode, today)}-1`;
        }
    }
    
    // First DCR for this branch and date
    return makeDcrNo(branchCode, today);
}

module.exports = {
    makeDcrNo,
    generateDcrNumber
};