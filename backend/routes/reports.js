const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../db');
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const branchOk = require('../middleware/branchGuard');

const router = express.Router();

// Helper function to get branch form structure
async function getBranchFormStructure(conn, branchId, date) {
    // Get active form for branch
    const [[form]] = await conn.query(
        `SELECT id, branch_id 
         FROM forms
         WHERE branch_id = ? 
         AND valid_from <= ?
         AND (valid_to IS NULL OR valid_to > ?)
         ORDER BY valid_from DESC
         LIMIT 1`,
        [branchId, date, date]
    );
    
    if (!form) {
        throw new Error(`No active form found for branch ${branchId} on ${date}`);
    }
    
    // Get groups and fields
    const [formStructure] = await conn.query(
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
        [form.id, form.id]
    );
    
    return { form, formStructure };
}

// Helper function to get contract rates
async function getContractRates(conn, branchId, date) {
    const [rates] = await conn.query(
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
        [branchId, date, date]
    );
    
    return rates;
}

// Helper function to format date as day of week
function getDayOfWeek(dateString) {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const date = new Date(dateString);
    return days[date.getDay()];
}

// Helper function to generate report data
async function generateReportData(conn, branchId, yearMonth) {
    // Get branch information
    const [[branch]] = await conn.query(
        'SELECT id, code, name FROM branches WHERE id = ?',
        [branchId]
    );
    
    if (!branch) {
        throw new Error(`Branch ${branchId} not found`);
    }
    
    // Get all accepted DCRs for the month
    const [dcrs] = await conn.query(
        `SELECT id, dcr_date, dcr_number, status
         FROM dcr_header
         WHERE branch_id = ?
         AND DATE_FORMAT(dcr_date, '%Y-%m') = ?
         AND status = 'ACCEPTED'
         ORDER BY dcr_date`,
        [branchId, yearMonth]
    );
    
    // If no accepted DCRs found, return empty data structure
    if (dcrs.length === 0) {
        // Get form structure anyway to provide proper structure
        const date = new Date(`${yearMonth}-01`);
        const { formStructure } = await getBranchFormStructure(conn, branchId, date);
        
        // Group form fields by group for empty structure
        const groups = [];
        const groupsMap = {};
        
        formStructure.forEach(field => {
            const groupId = field.gid || 'ungrouped';
            
            if (!groupsMap[groupId]) {
                const group = {
                    id: groupId,
                    label: field.group_label || 'General',
                    fields: []
                };
                groupsMap[groupId] = group;
                groups.push(group);
            }
            
            if (field.fid) {
                groupsMap[groupId].fields.push({
                    id: field.fid,
                    key: field.key_code,
                    label: field.field_label,
                    dataType: field.data_type,
                    required: !!field.required,
                    customerId: field.customer_id,
                    customerCode: field.customer_code,
                    customerName: field.customer_name,
                    categoryId: field.category_id,
                    categoryCode: field.category_code,
                    categoryName: field.category_name,
                    categoryUom: field.category_uom
                });
            }
        });
        
        return {
            branch,
            period: yearMonth,
            dailyData: [],
            groups,
            fieldTotals: {},
            revenueTotals: {},
            summary: {
                totalConsumption: 0,
                totalRevenue: 0,
                avgCostPerManday: 0
            }
        };
    }
    
    // Continue with normal processing for found DCRs
    // Get first date of the month for form structure and contract rates
    const firstDcr = dcrs[0].dcr_date;
    
    // Get form structure
    const { formStructure } = await getBranchFormStructure(conn, branchId, firstDcr);
    
    // Get contract rates
    const contractRates = await getContractRates(conn, branchId, firstDcr);
    
    // Map rates by customer_id and category_id for easy access
    const ratesMap = {};
    contractRates.forEach(rate => {
        if (!ratesMap[rate.customer_id]) {
            ratesMap[rate.customer_id] = {};
        }
        ratesMap[rate.customer_id][rate.category_id] = rate.rate;
    });
    
    // Group form fields by group
    const groups = [];
    const groupsMap = {};
    
    formStructure.forEach(field => {
        const groupId = field.gid || 'ungrouped';
        
        if (!groupsMap[groupId]) {
            const group = {
                id: groupId,
                label: field.group_label || 'General',
                fields: []
            };
            groupsMap[groupId] = group;
            groups.push(group);
        }
        
        if (field.fid) {
            groupsMap[groupId].fields.push({
                id: field.fid,
                key: field.key_code,
                label: field.field_label,
                dataType: field.data_type,
                required: !!field.required,
                customerId: field.customer_id,
                customerCode: field.customer_code,
                customerName: field.customer_name,
                categoryId: field.category_id,
                categoryCode: field.category_code,
                categoryName: field.category_name,
                categoryUom: field.category_uom
            });
        }
    });
    
    // Process each DCR to gather data
    const dailyData = [];
    let totalConsumption = 0;
    let totalRevenue = 0;
    
    // Collect all unique field keys for all groups
    const allFieldKeys = {};
    groups.forEach(group => {
        group.fields.forEach(field => {
            if (field.key !== 'date' && field.key !== 'consumption') {
                if (!allFieldKeys[group.id]) {
                    allFieldKeys[group.id] = [];
                }
                allFieldKeys[group.id].push(field);
            }
        });
    });
    
    // Get aggregate totals for each key
    const fieldTotals = {};
    const revenueTotals = {};
    
    for (const dcr of dcrs) {
        // Get all values for this DCR
        const [dcrValues] = await conn.query(
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
        dcrValues.forEach(dv => {
            valuesMap[dv.field_id] = dv.value_num;
        });
        
        // Create day summary object
        const daySummary = {
            id: dcr.id,
            date: dcr.dcr_date,
            day: getDayOfWeek(dcr.dcr_date),
            groups: {},
            consumption: 0,
            revenue: 0
        };
        
        // Get consumption value
        const consumptionField = formStructure.find(f => f.key_code === 'consumption');
        if (consumptionField && valuesMap[consumptionField.fid]) {
            daySummary.consumption = Number(valuesMap[consumptionField.fid]) || 0;
        }
        
        // Process each group and its fields
        for (const group of groups) {
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
                if (field.key === 'date' || field.key === 'consumption') continue;
                
                const value = Number(valuesMap[field.id] || 0);
                
                // Initialize in field totals if not existing
                if (!fieldTotals[field.id]) {
                    fieldTotals[field.id] = {
                        total: 0,
                        label: field.label,
                        customerId: field.customerId,
                        categoryId: field.categoryId,
                        customerName: field.customerName,
                        categoryName: field.categoryName,
                        customerCode: field.customerCode,
                        categoryCode: field.categoryCode,
                        groupId: group.id,
                        groupLabel: group.label
                    };
                }
                
                // Add to totals
                fieldTotals[field.id].total += value;
                
                // Calculate revenue if applicable
                let revenue = 0;
                if (field.customerId && field.categoryId) {
                    const rate = ratesMap[field.customerId] && 
                                ratesMap[field.customerId][field.categoryId] ?
                                Number(ratesMap[field.customerId][field.categoryId]) : 0;
                    
                    if (rate > 0) {
                        revenue = value * rate;
                        
                        // Initialize revenue totals
                        const revKey = `${field.customerId}_${field.categoryId}`;
                        if (!revenueTotals[revKey]) {
                            revenueTotals[revKey] = {
                                revenue: 0,
                                count: 0,
                                rate,
                                customerId: field.customerId, 
                                categoryId: field.categoryId,
                                customerName: field.customerName,
                                categoryName: field.categoryName,
                                customerCode: field.customerCode,
                                categoryCode: field.categoryCode,
                                groupId: group.id,
                                groupLabel: group.label
                            };
                        }
                        
                        revenueTotals[revKey].revenue += revenue;
                        revenueTotals[revKey].count += value;
                    }
                }
                
                // Store in day summary
                daySummary.groups[group.id].fields[field.key] = {
                    value,
                    revenue,
                    rate: (field.customerId && field.categoryId && ratesMap[field.customerId] && 
                          ratesMap[field.customerId][field.categoryId]) ? 
                          Number(ratesMap[field.customerId][field.categoryId]) : 0,
                    label: field.label,
                    customerId: field.customerId,
                    categoryId: field.categoryId,
                    customerName: field.customerName,
                    categoryName: field.categoryName
                };
                
                // Update group totals
                daySummary.groups[group.id].totals.count += value;
                daySummary.groups[group.id].totals.revenue += revenue;
                
                // Update day totals
                daySummary.revenue += revenue;
            }
        }
        
        dailyData.push(daySummary);
        
        // Update monthly totals
        totalConsumption += daySummary.consumption;
        totalRevenue += daySummary.revenue;
    }
    
    // Calculate cost metrics
    const avgCostPerManday = totalRevenue > 0 ? (totalConsumption / totalRevenue) * 100 : 0;
    
    // Return the report data in a more flexible structure
    return {
        branch,
        period: yearMonth,
        dailyData,
        groups,
        fieldTotals,
        revenueTotals,
        summary: {
            totalConsumption,
            totalRevenue,
            avgCostPerManday
        }
    };
}

// Get report data in JSON format
router.get('/branches/:branchId/reports/:yearMonth/data', auth, role('ADMIN'), branchOk('branchId'), async (req, res) => {
    const branchId = +req.params.branchId;
    const yearMonth = req.params.yearMonth;
    
    let conn;
    try {
        conn = await db.getConnection();
        const reportData = await generateReportData(conn, branchId, yearMonth);
        res.json(reportData);
    } catch (err) {
        console.error('Report data error:', err);
        res.status(500).json({ error: err.message || 'Failed to generate report data' });
    } finally {
        if (conn) {
            conn.release();
        }
    }
});

// Generate PDF report
router.get('/branches/:branchId/reports/:yearMonth/pdf', auth, role('ADMIN'), branchOk('branchId'), async (req, res) => {
    const branchId = +req.params.branchId;
    const yearMonth = req.params.yearMonth;
    
    let conn;
    try {
        conn = await db.getConnection();
        const reportData = await generateReportData(conn, branchId, yearMonth);
        
        // Create PDF document
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=report-${reportData.branch.code}-${yearMonth}.pdf`);
        
        // Pipe the PDF to the response
        doc.pipe(res);
        
        // Generate PDF based on branch-specific structure
        generatePDFReport(doc, reportData);
        
        // Finalize PDF
        doc.end();
    } catch (err) {
        console.error('PDF generation error:', err);
        
        // Check if headers have already been sent
        if (!res.headersSent) {
            res.status(500).json({ error: err.message || 'Failed to generate report' });
        } else {
            // If headers sent but response not finished, we need to end the response
            if (!res.finished) {
                res.end();
            }
            // Nothing to do if response already finished
        }
    } finally {
        // Always release the connection to prevent leaks
        if (conn) {
            conn.release();
        }
    }
});

// Generate branch-specific PDF report
function generatePDFReport(doc, reportData) {
    // Add report header
    doc.fontSize(16).text(`Monthly Report - ${reportData.branch.name}`, { align: 'center' });
    doc.fontSize(12).text(`Period: ${reportData.period}`, { align: 'center' });
    doc.moveDown();
    
    // Initialize position and column calculations
    const tableTop = 120;
    let currentY = tableTop;
    
    // Draw basic columns (date, day)
    doc.fontSize(10)
        .text('Date', 30, tableTop - 15, { width: 70, align: 'center' })
        .text('Day', 100, tableTop - 15, { width: 40, align: 'center' });
    
    let currentX = 140;
    
    // Group columns by group
    reportData.groups.forEach(group => {
        // Skip groups with no fields or only system fields
        const relevantFields = group.fields.filter(f => 
            f.key !== 'date' && f.key !== 'consumption' && 
            f.key !== 'opening_stock' && f.key !== 'closing_stock');
        
        if (relevantFields.length === 0) return;
        
        // Determine column width based on number of fields
        const groupWidth = Math.min(relevantFields.length * 50, 200);
        
        // Draw group header
        doc.rect(currentX, tableTop - 30, groupWidth, 15)
            .fillAndStroke('#f2f2f2', '#000000');
        doc.fillColor('#000000').text(group.label, currentX, tableTop - 28, { width: groupWidth, align: 'center' });
        
        // Draw individual field headers
        relevantFields.forEach((field, i) => {
            const fieldWidth = 50;
            doc.text(field.label, currentX + (i * fieldWidth), tableTop - 15, { width: fieldWidth, align: 'center' });
        });
        
        currentX += groupWidth;
    });
    
    // Draw consumption/revenue/cost columns
    doc.text('Consumption', currentX, tableTop - 15, { width: 80, align: 'center' });
    doc.text('Total Revenue', currentX + 80, tableTop - 15, { width: 80, align: 'center' });
    doc.text('Cost %', currentX + 160, tableTop - 15, { width: 60, align: 'center' });
    
    // Draw header separator
    doc.moveTo(30, tableTop)
       .lineTo(currentX + 220, tableTop)
       .stroke();
    
    currentY = tableTop + 5;
    
    // Draw data rows
    reportData.dailyData.forEach((day, index) => {
        // Date formatting
        const date = new Date(day.date);
        const formattedDate = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getFullYear()).slice(2)}`;
        
        // Fill row background for odd rows
        if (index % 2 !== 0) {
            doc.fillColor('#f9f9f9')
               .rect(30, currentY - 5, currentX + 220 - 30, 20)
               .fill()
               .fillColor('#000000');
        }
        
        // Output date and day
        doc.text(formattedDate, 30, currentY, { width: 70, align: 'center' })
           .text(day.day, 100, currentY, { width: 40, align: 'center' });
        
        let colX = 140;
        
        // Output group data
        reportData.groups.forEach(group => {
            // Skip groups with no fields or only system fields
            const relevantFields = group.fields.filter(f => 
                f.key !== 'date' && f.key !== 'consumption' && 
                f.key !== 'opening_stock' && f.key !== 'closing_stock');
            
            if (relevantFields.length === 0) return;
            
            // Draw field values
            relevantFields.forEach((field, i) => {
                const value = day.groups[group.id]?.fields[field.key]?.value || 0;
                doc.text(Number(value).toString(), colX + (i * 50), currentY, { width: 50, align: 'center' });
            });
            
            colX += Math.min(relevantFields.length * 50, 200);
        });
        
        // Output consumption, revenue, cost
        doc.text(Number(day.consumption).toFixed(2), colX, currentY, { width: 80, align: 'center' })
           .text(Number(day.revenue).toFixed(2), colX + 80, currentY, { width: 80, align: 'center' });
        
        const costPercentage = day.revenue > 0 ? ((day.consumption / day.revenue) * 100) : 0;
        doc.text(Number(costPercentage).toFixed(2) + '%', colX + 160, currentY, { width: 60, align: 'center' });
        
        currentY += 20;
    });
    
    // Draw a summary row separator
    doc.moveTo(30, currentY)
       .lineTo(currentX + 220, currentY)
       .stroke();
    
    // Draw summary row
    currentY += 10;
    doc.fontSize(10).font('Helvetica-Bold')
       .text('TOTAL', 30, currentY, { width: 110, align: 'center' });
    
    let sumX = 140;
    
    // Output group totals
    reportData.groups.forEach(group => {
        // Skip groups with no fields or only system fields
        const relevantFields = group.fields.filter(f => 
            f.key !== 'date' && f.key !== 'consumption' && 
            f.key !== 'opening_stock' && f.key !== 'closing_stock');
        
        if (relevantFields.length === 0) return;
        
        // Display field totals
        relevantFields.forEach((field, i) => {
            const total = reportData.fieldTotals[field.id]?.total || 0;
            doc.text(Number(total).toString(), sumX + (i * 50), currentY, { width: 50, align: 'center' });
        });
        
        sumX += Math.min(relevantFields.length * 50, 200);
    });
    
    // Output totals for consumption, revenue, cost
    doc.text(Number(reportData.summary.totalConsumption).toFixed(2), sumX, currentY, { width: 80, align: 'center' })
       .text(Number(reportData.summary.totalRevenue).toFixed(2), sumX + 80, currentY, { width: 80, align: 'center' });
    
    const totalCostPercentage = reportData.summary.totalRevenue > 0 ? 
        ((reportData.summary.totalConsumption / reportData.summary.totalRevenue) * 100) : 0;
    
    doc.text(Number(totalCostPercentage).toFixed(2) + '%', sumX + 160, currentY, { width: 60, align: 'center' });
}

module.exports = router;