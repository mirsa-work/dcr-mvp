/**
 * FormSpec Controller
 * Handles business logic for form specifications
 */
const db = require('../../../db');
const { ApiError } = require('../../../utils/core');

/**
 * Get form specification for a branch
 */
async function getFormSpec(req, res) {
    const { branchId } = req.query;
    
    if (!branchId) {
        throw new ApiError('Branch ID is required', 400);
    }
    
    try {
        // Find the active form for this branch
        const formResult = await db.query(
            `SELECT id FROM forms
            WHERE branch_id = ? AND valid_from <= CURDATE()
            AND (valid_to IS NULL OR valid_to > CURDATE())`,
            [branchId]
        );
        
        // Check if any forms were found
        if (!formResult || formResult.length === 0) {
            throw new ApiError('No active form found for this branch', 404);
        }
        
        const formId = formResult[0].id;
        
        // Query all groups and fields
        const rows = await db.query(
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
                    f.sort_order AS field_sort_order,
                    f.customer_id,
                    f.category_id
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
                    f.sort_order AS field_sort_order,
                    f.customer_id,
                    f.category_id
                FROM form_groups g
                JOIN form_fields f ON f.group_id = g.id
                LEFT JOIN customers c ON c.id = f.customer_id
                LEFT JOIN contract_categories cat ON cat.id = f.category_id
                WHERE g.form_id = ?
            )
            ORDER BY 
                CASE WHEN gid IS NULL THEN 0 ELSE 1 END,
                group_sort_order,
                field_sort_order`, 
            [formId, formId]
        );
        
        // Build the response structure
        const groups = [];
        const map = {};
        
        // Check if rows exist and have content
        if (rows && rows.length > 0) {
            for (const r of rows) {
                if (!map[r.gid]) {
                    map[r.gid] = { 
                        id: r.gid,
                        label: r.group_label, 
                        fields: [] 
                    };
                    groups.push(map[r.gid]);
                }
                
                if (r.fid) {
                    map[r.gid].fields.push({
                        id: r.fid,
                        key: r.key_code, 
                        label: r.field_label, 
                        type: r.data_type,
                        required: !!r.required,
                        customerId: r.customer_id,
                        categoryId: r.category_id,
                        customer_code: r.customer_code || null,
                        category_code: r.category_code || null
                    });
                }
            }
        } else {
            // Form exists but has no fields - return empty structure
            groups.push({ label: "", fields: [] });
        }
        
        return res.json({ groups });
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        console.error('Form spec error:', error);
        throw new ApiError('Failed to generate form specification', 500);
    }
}

module.exports = {
    getFormSpec
}; 