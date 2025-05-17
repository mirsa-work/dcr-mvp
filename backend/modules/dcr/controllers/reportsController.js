/**
 * Reports Controller
 * Handles business logic for report generation
 */
const db = require('../../../db');
const { ApiError } = require('../../../utils/core');
const PDFDocument = require('pdfkit');

/**
 * Get form specification for a branch using relational tables
 */
async function getFormSpecForBranch(branchId) {
    // Find the active form for this branch
    const formResult = await db.query(
        `SELECT id FROM forms
        WHERE branch_id = ? AND valid_from <= CURDATE()
        AND (valid_to IS NULL OR valid_to > CURDATE())`,
        [branchId]
    );
    
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
                c.id AS customer_id,
                c.code AS customer_code,
                c.name AS customer_name, 
                cat.id AS category_id,
                cat.code AS category_code,
                cat.name AS category_name,
                cat.uom AS category_uom,
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
                c.id AS customer_id,
                c.code AS customer_code,
                c.name AS customer_name,
                cat.id AS category_id,
                cat.code AS category_code,
                cat.name AS category_name,
                cat.uom AS category_uom,
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
                    customerCode: r.customer_code || null,
                    customerName: r.customer_name || null,
                    categoryCode: r.category_code || null,
                    categoryName: r.category_name || null,
                    categoryUom: r.category_uom || null
                });
            }
        }
    } else {
        // Form exists but has no fields - return empty structure
        groups.push({ label: "", fields: [] });
    }
    
    return { groups };
}

/**
 * Get report data for a branch and period
 */
async function getReportData(req, res) {
    const { branchId, yearMonth } = req.params;
    
    try {
        // Use the shared internal function to get the report data
        const reportData = await getReportDataInternal(branchId, yearMonth);
        return res.json(reportData);
    } catch (err) {
        console.error('Report data error:', err);
        throw new ApiError(err.message || 'Failed to generate report data', 500);
    }
}

/**
 * Generate PDF report for a branch and period
 */
async function getReportPdf(req, res) {
    const { branchId, yearMonth } = req.params;
    
    // Get report data (reuse the same logic from getReportData)
    const data = await getReportDataInternal(branchId, yearMonth);
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${yearMonth}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add content to PDF
    doc.fontSize(25).text(`${data.branch.name} - ${data.period}`, {
        align: 'center'
    });
    
    doc.moveDown();
    
    // In a real implementation, this would generate a nicely formatted PDF table
    doc.fontSize(12).text('This is a placeholder for the actual PDF report', {
        align: 'center'
    });
    
    // Finalize PDF
    doc.end();
}

/**
 * Internal function to get report data
 * This avoids duplicating code between JSON and PDF endpoints
 */
async function getReportDataInternal(branchId, yearMonth) {
    // Get branch information
    const branchResult = await db.query(
        'SELECT * FROM branches WHERE id = ?',
        [branchId]
    );
    
    if (!branchResult || branchResult.length === 0) {
        throw new ApiError('Branch not found', 404);
    }
    
    // Get form specification for the branch
    const spec = await getFormSpecForBranch(branchId);
    
    // Get accepted DCRs for the period
    const dcrs = await db.query(
        'SELECT * FROM dcr_header WHERE branch_id = ? AND DATE_FORMAT(dcr_date, "%Y-%m") = ? AND status = ?',
        [branchId, yearMonth, 'ACCEPTED']
    );
    
    if (!dcrs || dcrs.length === 0) {
        // Return empty report structure if no DCRs
        return {
            branch: branchResult[0],
            period: yearMonth,
            groups: spec.groups || [],
            dailyData: [],
            fieldTotals: {},
            revenueTotals: {},
            summary: {
                totalConsumption: 0,
                totalRevenue: 0
            }
        };
    }

    // Get contract rates for this branch and period
    const contractRates = await db.query(
        `SELECT 
            con.id AS contract_id,
            con.customer_id,
            c.code AS customer_code,
            c.name AS customer_name,
            cr.category_id,
            cc.code AS category_code,
            cc.name AS category_name,
            cr.rate
         FROM contracts con
         JOIN customers c ON c.id = con.customer_id
         JOIN contract_rates cr ON cr.contract_id = con.id
         JOIN contract_categories cc ON cc.id = cr.category_id
         WHERE con.branch_id = ?
            AND con.valid_from <= ?
            AND (con.valid_to IS NULL OR con.valid_to > ?)`,
        [branchId, `${yearMonth}-01`, `${yearMonth}-01`]
    );
    
    // Map rates by customer_id and category_id for easy access
    const ratesMap = {};
    if (contractRates && contractRates.length > 0) {
        contractRates.forEach(rate => {
            if (!ratesMap[rate.customer_id]) {
                ratesMap[rate.customer_id] = {};
            }
            ratesMap[rate.customer_id][rate.category_id] = rate.rate;
        });
    }
    
    // Process DCR data and generate report
    const dailyData = [];
    const fieldTotals = {};
    const revenueTotals = {};
    let totalConsumption = 0;
    let totalRevenue = 0;
    
    // Process each DCR to gather data
    for (const dcr of dcrs) {
        // Get all values for this DCR
        const dcrValues = await db.query(
            `SELECT 
                dv.field_id,
                dv.value_num,
                ff.key_code,
                ff.customer_id,
                ff.category_id,
                ff.group_id
             FROM dcr_values dv
             JOIN form_fields ff ON ff.id = dv.field_id
             WHERE dv.dcr_id = ?`,
            [dcr.id]
        );
        
        // Map values by field_id for easier access
        const valuesMap = {};
        if (dcrValues && dcrValues.length > 0) {
            dcrValues.forEach(dv => {
                valuesMap[dv.field_id] = dv.value_num;
            });
        }
        
        // Create day summary object
        const daySummary = {
            id: dcr.id,
            date: dcr.dcr_date,
            day: getDayOfWeek(dcr.dcr_date),
            groups: {},
            consumption: 0,
            revenue: 0
        };
        
        // Helper function to get day of week
        function getDayOfWeek(dateString) {
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const date = new Date(dateString);
            return days[date.getDay()];
        }
        
        // Process each group and its fields
        for (const group of spec.groups) {
            daySummary.groups[group.id] = {
                label: group.label,
                fields: {},
                totals: {
                    count: 0,
                    revenue: 0
                }
            };
            
            // Process each field in group
            for (const field of group.fields) {
                if (field.key === 'date') continue;
                
                // Try to find the value for this field
                const value = findValueForField(field.id, valuesMap) || 0;
                
                // If this is the consumption field, update summary
                if (field.key === 'consumption') {
                    daySummary.consumption = Number(value);
                    continue;
                }
                
                // Add to field totals
                if (!fieldTotals[field.id]) {
                    fieldTotals[field.id] = {
                        total: 0,
                        label: field.label,
                        customerId: field.customerId,
                        categoryId: field.categoryId
                    };
                }
                fieldTotals[field.id].total += Number(value);

                // Calculate revenue if applicable
                let revenue = 0;
                if (field.customerId && field.categoryId) {
                    const rate = ratesMap[field.customerId] && 
                                ratesMap[field.customerId][field.categoryId] ?
                                Number(ratesMap[field.customerId][field.categoryId]) : 0;
                    
                    if (rate > 0) {
                        revenue = Number(value) * rate;
                        
                        // Initialize revenue totals
                        const revKey = `${field.customerId}_${field.categoryId}`;
                        if (!revenueTotals[revKey]) {
                            revenueTotals[revKey] = {
                                revenue: 0,
                                count: 0,
                                rate,
                                customerId: field.customerId, 
                                categoryId: field.categoryId,
                                customerName: field.customerName || field.customerCode,
                                categoryName: field.categoryName || field.categoryCode,
                                customerCode: field.customerCode,
                                categoryCode: field.categoryCode
                            };
                        }
                        
                        revenueTotals[revKey].revenue += revenue;
                        revenueTotals[revKey].count += Number(value);
                    }
                }
                
                // Store in day summary
                daySummary.groups[group.id].fields[field.key] = {
                    value: Number(value),
                    label: field.label,
                    revenue,
                    rate: (field.customerId && field.categoryId && ratesMap[field.customerId] && 
                          ratesMap[field.customerId][field.categoryId]) ? 
                          Number(ratesMap[field.customerId][field.categoryId]) : 0,
                    customerId: field.customerId,
                    categoryId: field.categoryId,
                    customerName: field.customerName,
                    categoryName: field.categoryName
                };
                
                // Update group totals
                daySummary.groups[group.id].totals.count += Number(value);
                daySummary.groups[group.id].totals.revenue += revenue;
                
                // Update day totals
                daySummary.revenue += revenue;
            }
        }
        
        // Helper function to find a value
        function findValueForField(fieldId, valuesMap) {
            return valuesMap[fieldId] || 0;
        }
        
        dailyData.push(daySummary);
        
        // Update monthly totals
        totalConsumption += daySummary.consumption;
        totalRevenue += daySummary.revenue;
    }
    
    const reportData = {
        branch: branchResult[0],
        period: yearMonth,
        groups: spec.groups || [],
        dailyData,
        fieldTotals,
        revenueTotals,
        summary: {
            totalConsumption,
            totalRevenue
        }
    };
    
    return reportData;
}

module.exports = {
    getReportData,
    getReportPdf
}; 