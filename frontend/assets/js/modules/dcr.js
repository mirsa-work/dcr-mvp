/**
 * DCR Module - Handles Daily Consumption Reports functionality
 */
(function(window, $, Core) {
    'use strict';

    // DCR module definition
    const DCR = {
        // Module configuration
        config: {
            endpoints: {
                branches: '/api/branches',
                dcr: '/api/dcr',
                formSpec: '/api/form-spec',
                reports: '/api/branches/{branchId}/reports/{yearMonth}/data',
                reportExcel: '/api/branches/{branchId}/reports/{yearMonth}/excel'
            },
            selectors: {
                views: {
                    records: '#dcrTab',
                    reports: '#reports'
                },
                navigation: {
                    recordsLink: 'a[data-bs-target="#dcrTab"]',
                    reportsLink: 'a[data-bs-target="#reports"]'
                },
                records: {
                    branchSelect: '#branchSelect',
                    monthSelect: '#monthSelect',
                    refreshBtn: '#refreshBtn',
                    newDcrBtn: '#newDcrBtn',
                    dcrTable: '#dcrTable'
                },
                reports: {
                    branchSelect: '#reportBranch',
                    monthSelect: '#reportMonth',
                    viewButton: '#viewReportBtn',
                    preview: '#reportPreview',
                    title: '#reportTitle',
                    downloadButton: '#downloadPdfBtn',
                    tableContainer: '#reportPreview .table-responsive'
                },
                modal: {
                    dcrModal: '#dcrModal',
                    title: '#dcrModalTitle',
                    form: '#dcrForm',
                    saveButton: '#saveDcrBtn'
                },
                header: {
                    title: '#headerTitle'
                }
            }
        },

        // Module state
        state: {
            branches: [],
            formSpecs: {}, // Cached by branch code
            editId: null,
            dataTable: null,
            initialized: false
        },

        // Initialize the DCR module
        init: function() {
            console.log('DCR module initializing');
            this.setupEventListeners();
            
            // Init UI if user is authenticated
            if (Core.auth.isAuthenticated()) {
                this.bootstrapUI();
            }
            
            // Mark as initialized
            this.state.initialized = true;
            return this;
        },

        // Set up event listeners
        setupEventListeners: function() {
            console.log('Setting up DCR event listeners');
            const s = this.config.selectors;
            
            // Tab navigation - update header title
            $(document).on('shown.bs.tab', 'a[data-bs-toggle="tab"]', (e) => {
                const targetId = $(e.target).attr('data-bs-target');
                if (targetId === s.views.records) {
                    $(s.header.title).text('DCR - Records');
                    // Focus the branch selector for Records tab
                    setTimeout(() => $(s.records.branchSelect).focus(), 100);
                } else if (targetId === s.views.reports) {
                    $(s.header.title).text('DCR - Reports');
                    // Focus the branch selector for Reports tab
                    setTimeout(() => $(s.reports.branchSelect).focus(), 100);
                }
            });

            // Records tab events - using on() for dynamic elements
            $(document).on('change', s.records.branchSelect, () => this.handleBranchChange());
            $(document).on('change', s.records.monthSelect, () => this.loadDcrTable());
            $(document).on('click', s.records.refreshBtn, () => this.loadDcrTable());
            $(document).on('click', s.records.newDcrBtn, () => this.openDcrModal(null));

            // DCR table action events
            $(document).on('click', `${s.records.dcrTable} .dcr-number-link`, (e) => {
                e.preventDefault();
                const $row = $(e.target).closest('tr');
                const dcrId = $row.data('id');
                const dcrStatus = $row.data('status');
                this.openDcrModal(dcrId, dcrStatus);
            });

            $(document).on('click', `${s.records.dcrTable} .action-btn`, (e) => {
                const action = $(e.target).data('action');
                const dcrId = $(e.target).closest('tr').data('id');
                this.handleDcrAction(action, dcrId);
            });

            // DCR Modal
            $(document).on('click', s.modal.saveButton, () => this.saveDcr());

            // Reports tab events
            $(document).on('click', s.reports.viewButton, () => {
                console.log('View report button clicked');
                const yearMonth = $(s.reports.monthSelect).val();
                const branchId = $(s.reports.branchSelect).val();
                
                console.log('Report params:', {yearMonth, branchId});

                if (!yearMonth || !branchId) {
                    Core.ui.showToast('Please select branch and month', 'danger');
                    return;
                }

                this.loadReport(branchId, yearMonth);
            });

            $(document).on('click', s.reports.downloadButton, () => {
                const branchId = $(s.reports.downloadButton).data('branch');
                const yearMonth = $(s.reports.downloadButton).data('period');
                this.downloadReportExcel(branchId, yearMonth);
            });
        },

        // Bootstrap the UI once authenticated
        bootstrapUI: function() {
            console.log('Bootstrapping DCR UI');
            
            // Skip if already bootstrapped
            if (this.state.bootstrapped) {
                return;
            }
            
            // Set header title
            $(this.config.selectors.header.title).text('DCR - Records');

            // Set current month to today
            const today = new Date();
            const currentMonth = today.toISOString().slice(0, 7);
            console.log('Setting current month to:', currentMonth);
            
            const s = this.config.selectors;
            $(s.records.monthSelect).val(currentMonth);
            $(s.reports.monthSelect).val(currentMonth);

            // Load branches data
            this.loadBranches()
                .then(() => {
                    // Load initial DCR data once branches are loaded
                    this.loadDcrTable();
                    
                    // Focus branch selector
                    setTimeout(() => $(s.records.branchSelect).focus(), 100);
                    
                    // Mark as bootstrapped
                    this.state.bootstrapped = true;
                })
                .catch(error => {
                    Core.ui.showToast('Failed to load branches', 'danger');
                    console.error('Bootstrap error:', error);
                });

            // Hide new DCR button if user isn't branch user
            if (!Core.auth.hasRole('BRANCH')) {
                $(this.config.selectors.records.newDcrBtn).hide();
            }
        },

        // Load branches data
        loadBranches: function() {
            console.log('Loading branches');
            return Core.api.get(this.config.endpoints.branches)
                .then(branches => {
                    console.log('Branches loaded:', branches);
                    this.state.branches = branches;
                    this.populateBranchSelect(branches);

                    // Set the first branch as current
                    if (branches.length > 0) {
                        return this.ensureFormSpec(branches[0].id, branches[0].code);
                    }
                });
        },

        // Populate branch select dropdowns
        populateBranchSelect: function(branches) {
            console.log('Populating branch selects');
            const $recordSelect = $(this.config.selectors.records.branchSelect).empty();
            const $reportSelect = $(this.config.selectors.reports.branchSelect).empty();

            branches.forEach(branch => {
                const option = `<option value="${branch.id}" data-code="${branch.code}">${branch.name}</option>`;
                $recordSelect.append(option);
                $reportSelect.append(option);
            });
        },

        // Ensure form specification is loaded
        ensureFormSpec: function(branchId, branchCode) {
            // Return if already cached
            if (this.state.formSpecs[branchCode]) {
                return Promise.resolve();
            }

            return Core.api.get(`${this.config.endpoints.formSpec}?branchId=${branchId}`)
                .then(spec => {
                    this.state.formSpecs[branchCode] = spec;
                });
        },

        // Handle branch change
        handleBranchChange: function() {
            const s = this.config.selectors.records;
            const branchId = $(s.branchSelect).val();
            const branchCode = $(s.branchSelect).find('option:selected').data('code');

            this.ensureFormSpec(branchId, branchCode)
                .then(() => this.loadDcrTable())
                .catch(error => {
                    Core.ui.showToast('Failed to load branch specification', 'danger');
                    console.error('Branch change error:', error);
                });
        },

        // Load DCR table data
        loadDcrTable: function() {
            console.log('Loading DCR table data');
            const s = this.config.selectors.records;
            const branchId = $(s.branchSelect).val();
            const month = $(s.monthSelect).val();
            
            if (!branchId) {
                console.error('No branch selected');
                Core.ui.showToast('Please select a branch', 'danger');
                return;
            }
            
            if (!month) {
                console.error('No month selected');
                Core.ui.showToast('Please select a month', 'danger');
                return;
            }

            console.log(`Loading DCRs for branch ${branchId} and month ${month}`);
            Core.api.get(`${this.config.endpoints.branches}/${branchId}/dcr?month=${month}`)
                .then(data => {
                    console.log('DCR data loaded:', data);
                    this.renderDcrTable(data);
                })
                .catch(error => {
                    Core.ui.showToast('Failed to load DCR data', 'danger');
                    console.error('DCR table load error:', error);
                });
        },

        // Render DCR table
        renderDcrTable: function(rows) {
            const $table = $(this.config.selectors.records.dcrTable);
            
            // Destroy existing DataTable if it exists
            if (this.state.dataTable) {
                this.state.dataTable.destroy();
                this.state.dataTable = null;
            }
            
            const $tableBody = $table.find('tbody').empty();

            // Add rows to table
            rows.forEach(row => {
                $tableBody.append(this.createDcrTableRow(row));
            });

            // Initialize DataTable
            this.state.dataTable = new DataTable($table[0], {
                pageLength: 10,
                order: [[0, 'desc']],
                responsive: true
            });
        },

        // Create DCR table row
        createDcrTableRow: function(dcr) {
            return `
                <tr data-id="${dcr.id}" data-status="${dcr.status}">
                    <td>${Core.ui.formatDate(dcr.dcr_date)}</td>
                    <td><a href="#" class="dcr-number-link">${dcr.dcr_number}</a></td>
                    <td>
                        <span class="d-none d-md-inline badge badge-${dcr.status}">${dcr.status}</span>
                        <span class="d-md-none status-icon" data-status="${dcr.status}" title="${dcr.status}"></span>
                    </td>
                    <td>${this.createActionButtons(dcr)}</td>
                </tr>
            `;
        },

        // Create action buttons
        createActionButtons: function(dcr) {
            const actions = [];
            const isBranchUser = Core.auth.hasRole('BRANCH');
            const isAdminUser = Core.auth.hasRole('ADMIN');

            if (['DRAFT', 'REJECTED'].includes(dcr.status) && isBranchUser) {
                actions.push(this.createActionButton('pencil', 'edit', 'Edit'));
                actions.push(this.createActionButton('arrow-up-circle', 'submit', 'Submit'));
            }

            if (dcr.status === 'SUBMITTED' && isAdminUser) {
                actions.push(this.createActionButton('check-circle', 'accept', 'Accept'));
                actions.push(this.createActionButton('x-circle', 'reject', 'Reject'));
            }

            if (dcr.status === 'ACCEPTED' && isAdminUser) {
                actions.push(this.createActionButton('arrow-counterclockwise', 'reopen', 'Re-open'));
            }

            return actions.length > 0 ? actions.join('') : '—';
        },

        // Create action button
        createActionButton: function(icon, action, title) {
            return `<i class="bi bi-${icon} action-btn" data-action="${action}" title="${title}"></i>`;
        },

        // Handle DCR action
        handleDcrAction: function(action, dcrId) {
            const actions = {
                edit: () => this.openDcrModal(dcrId, 'DRAFT'),
                submit: () => this.updateDcrStatus(dcrId, 'submit'),
                accept: () => this.updateDcrStatus(dcrId, 'accept'),
                reject: () => {
                    const reason = prompt('Reject reason?');
                    if (reason !== null) {
                        this.updateDcrStatus(dcrId, 'reject', { reason });
                    }
                },
                reopen: () => this.updateDcrStatus(dcrId, 'reopen')
            };

            if (actions[action]) {
                actions[action]();
            }
        },

        // Update DCR status
        updateDcrStatus: function(dcrId, action, data = {}) {
            Core.api.post(`${this.config.endpoints.dcr}/${dcrId}/${action}`, data)
                .then(() => {
                    Core.ui.showToast(`DCR ${action} successful`);
                    this.loadDcrTable();
                })
                .catch(error => {
                    Core.ui.showToast(`Failed to ${action} DCR`, 'danger');
                    console.error(`DCR ${action} error:`, error);
                });
        },

        // Open DCR modal
        openDcrModal: function(dcrId, dcrStatus) {
            console.log('Opening DCR modal', {dcrId, dcrStatus});
            const s = this.config.selectors;
            const isReadOnly = !Core.auth.hasRole('BRANCH') || (dcrId && dcrStatus !== 'DRAFT' && dcrStatus !== 'REJECTED');

            this.state.editId = dcrId;
            const branchCode = $(s.records.branchSelect).find('option:selected').data('code');
            const formSpec = this.state.formSpecs[branchCode];

            console.log('Form spec:', formSpec);
            if (!formSpec) {
                Core.ui.showToast('No form specification available for this branch', 'danger');
                return;
            }

            // Set modal title
            $(s.modal.title).text(dcrId ? (isReadOnly ? 'View DCR' : 'Edit DCR') : 'New Daily Consumption Report');

            // Build form
            this.buildDcrForm(formSpec, isReadOnly);

            // Load data if editing
            if (dcrId) {
                this.loadDcrData(dcrId);
            }

            // Show modal
            try {
                const modalElement = document.querySelector(s.modal.dcrModal);
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            } catch (error) {
                console.error('Error showing modal:', error);
                Core.ui.showToast('Error opening DCR form', 'danger');
            }
        },

        // Build DCR form
        buildDcrForm: function(formSpec, isReadOnly = false) {
            console.log('Building DCR form', {formSpec, isReadOnly});
            const form = $(this.config.selectors.modal.form).empty();
            
            // Make sure we have a valid form spec
            if (!formSpec || !formSpec.groups) {
                console.error('Invalid form spec:', formSpec);
                form.append('<div class="col-12 text-danger">Error: Invalid form specification</div>');
                return;
            }
            
            // Add date field at the top
            form.append(`
                <div class="col-md-4">
                    <label class="form-label">Date<span class="text-danger">*</span></label>
                    <input class="form-control ${isReadOnly ? 'readonly-input' : ''}" 
                           type="date" 
                           name="date" 
                           ${isReadOnly ? 'readonly' : ''} 
                           required>
                </div>
            `);

            // Add fields from groups
            formSpec.groups.forEach(group => {
                if (group.label) {
                    form.append(`
                        <div class="col-12 form-section">
                            <h6 class="form-section-header">${group.label}</h6>
                            <hr class="mt-0 mb-2">
                        </div>
                    `);
                }

                if (group.fields && Array.isArray(group.fields)) {
                    group.fields.forEach(field => {
                        // Skip date field as we've already added it
                        if (field.key === 'date') return;
                        
                        const inputType = field.type === 'date' ? 'date' : 'number';
                        const step = field.type === 'decimal' ? '0.01' : '1';

                        form.append(`
                            <div class="col-md-4">
                                <label class="form-label">
                                    ${field.label}${field.required ? '<span class="text-danger">*</span>' : ''}
                                </label>
                                <input class="form-control ${isReadOnly ? 'readonly-input' : ''}" 
                                       type="${inputType}" 
                                       step="${step}" 
                                       name="${field.key}" 
                                       ${isReadOnly ? 'readonly' : ''} 
                                       ${field.required ? 'required' : ''}>
                            </div>
                        `);
                    });
                }
            });

            // Hide save button if in read-only mode
            const $saveBtn = $(this.config.selectors.modal.saveButton);
            if (isReadOnly) {
                $saveBtn.hide();
            } else {
                $saveBtn.show();
            }
        },

        // Load DCR data
        loadDcrData: function(dcrId) {
            console.log('Loading DCR data for ID:', dcrId);
            Core.api.get(`${this.config.endpoints.dcr}/${dcrId}`)
                .then(dcr => {
                    console.log('DCR data loaded:', dcr);
                    this.populateDcrForm(dcr);
                })
                .catch(error => {
                    Core.ui.showToast('Failed to load DCR data', 'danger');
                    console.error('DCR load error:', error);
                });
        },

        // Populate DCR form
        populateDcrForm: function(dcr) {
            console.log('Populating DCR form with data:', dcr);
            const form = $(this.config.selectors.modal.form);
            
            // Set date field
            if (dcr.dcr_date) {
                const dateInput = form.find('[name="date"]');
                const date = new Date(dcr.dcr_date);
                const dateString = date.toISOString().slice(0, 10);
                dateInput.val(dateString);
            }
            
            // Set other field values
            if (dcr.values && Array.isArray(dcr.values)) {
                console.log('Processing values:', dcr.values);
                
                // Find field key mapping from form spec
                const branchCode = $(this.config.selectors.records.branchSelect).find('option:selected').data('code');
                const formSpec = this.state.formSpecs[branchCode];
                
                if (formSpec && formSpec.groups) {
                    // Create a map of field IDs to field keys
                    const fieldMap = {};
                    formSpec.groups.forEach(group => {
                        if (group.fields) {
                            group.fields.forEach(field => {
                                if (field.id) {
                                    fieldMap[field.id] = field.key;
                                }
                            });
                        }
                    });
                    
                    console.log('Field mapping:', fieldMap);
                    
                    // Set values using the mapping
                    dcr.values.forEach(value => {
                        const fieldKey = fieldMap[value.field_id];
                        if (fieldKey) {
                            const input = form.find(`[name="${fieldKey}"]`);
                            if (input.length) {
                                input.val(value.value_num);
                            }
                        }
                    });
                }
            } else {
                // Legacy format or direct values
                Object.entries(dcr).forEach(([key, value]) => {
                    if (key !== 'id' && key !== 'dcr_date' && key !== 'values') {
                        const input = form.find(`[name="${key}"]`);
                        if (input.length) {
                            input.val(value);
                        }
                    }
                });
            }
        },

        // Save DCR
        saveDcr: function() {
            const s = this.config.selectors;
            
            // Validate form
            if (!document.querySelector(s.modal.form).reportValidity()) {
                return;
            }

            const formData = this.serializeForm($(s.modal.form));
            const branchId = $(s.records.branchSelect).val();

            const request = this.state.editId
                ? {
                    url: `${this.config.endpoints.dcr}/${this.state.editId}`,
                    method: 'PUT',
                    data: formData
                }
                : {
                    url: `${this.config.endpoints.branches}/${branchId}/dcr`,
                    method: 'POST',
                    data: formData
                };

            Core.api[request.method.toLowerCase()](request.url, request.data)
                .then(() => {
                    const modal = bootstrap.Modal.getInstance(document.querySelector(s.modal.dcrModal));
                    modal.hide();
                    Core.ui.showToast('DCR saved successfully');
                    this.loadDcrTable();
                })
                .catch(error => {
                    let errorMessage = 'Failed to save DCR';
                    if (error.message) {
                        errorMessage = error.message;
                    }
                    Core.ui.showToast(errorMessage, 'danger');
                    console.error('DCR save error:', error);
                });
        },

        // Serialize form to object
        serializeForm: function(form) {
            return Object.fromEntries(
                form.serializeArray().map(item => [item.name, item.value])
            );
        },

        // Load report data
        loadReport: function(branchId, yearMonth) {
            console.log('Loading report data', {branchId, yearMonth});
            const url = this.config.endpoints.reports
                .replace('{branchId}', branchId)
                .replace('{yearMonth}', yearMonth);
            
            console.log('Report URL:', Core.config.apiBaseUrl + url);
                
            Core.api.get(url)
                .then(data => {
                    console.log('Report data loaded:', data);
                    this.displayReport(data);
                })
                .catch(err => {
                    console.error('Report generation error:', err);
                    Core.ui.showToast(err.message || 'Failed to generate report', 'danger');
                });
        },

        // Display report
        displayReport: function(data) {
            const s = this.config.selectors.reports;
            
            // Show report preview
            $(s.preview).removeClass('d-none');

            // Set report title
            $(s.title).text(`${data.branch.name} - ${data.period}`);

            // Create tables
            this.createReportTables(data);

            // Set download Excel button
            $(s.downloadButton).data('branch', data.branch.id).data('period', data.period);

            // Update button text and icon for Excel
            $(s.downloadButton).html('<i class="bi bi-file-excel"></i> <span class="d-none d-md-inline">Download Excel</span>');
        },

        // Create report tables
        createReportTables: function(data) {
            const tableContainer = $(this.config.selectors.reports.tableContainer);
            tableContainer.empty();
            
            // Check if we have any daily data
            if (data.dailyData.length === 0) {
                tableContainer.html('<div class="alert alert-info mt-3">No accepted DCRs found for this month. Please select a different month or ensure DCRs have been approved.</div>');
                return;
            }
            
            // Create the Cost/Revenue table
            this.createCostRevenueTable(data, tableContainer);
            
            // Create the Stock table
            this.createStockTable(data, tableContainer);
        },

        // Create Cost/Revenue table
        createCostRevenueTable: function(data, container) {
            // Create table element
            const table = $('<table class="table table-sm table-bordered table-hover mb-4" id="costRevenueTable"></table>');
            
            // Create the header
            const thead = $('<thead class="table-light"></thead>');
            
            // First header row - Group headers
            const headerRow1 = $('<tr></tr>');
            headerRow1.append('<th rowspan="2">Date</th>');
            headerRow1.append('<th rowspan="2">Day</th>');
            
            // Add group columns (excluding Stock group)
            data.groups.forEach(group => {
                // Skip Stock group and groups with no fields or system fields
                if (group.label === 'Stock') return;
                
                const relevantFields = group.fields.filter(f => 
                    f.key !== 'date' && f.key !== 'consumption');
                
                if (relevantFields.length === 0) return;
                
                headerRow1.append(`<th colspan="${relevantFields.length}" class="text-center">${group.label}</th>`);
            });
            
            // Add consumption/revenue columns
            headerRow1.append('<th rowspan="2" class="text-center">Consumption</th>');
            headerRow1.append('<th rowspan="2" class="text-center">Total Revenue</th>');
            headerRow1.append('<th rowspan="2" class="text-center">Cost %</th>');
            
            // Second header row - Field names
            const headerRow2 = $('<tr></tr>');
            
            // Add field column headers (excluding Stock fields)
            data.groups.forEach(group => {
                // Skip Stock group and groups with no fields or system fields
                if (group.label === 'Stock') return;
                
                const relevantFields = group.fields.filter(f => 
                    f.key !== 'date' && f.key !== 'consumption');
                
                if (relevantFields.length === 0) return;
                
                // Add each field header
                relevantFields.forEach(field => {
                    // Add rate if available
                    const rate = this.findRateForField(data.revenueTotals, field);
                    const rateText = rate ? `<br>${rate.toFixed(2)}` : '';
                    headerRow2.append(`<th class="text-center">${field.label}${rateText}</th>`);
                });
            });
            
            // Add headers to table
            thead.append(headerRow1);
            thead.append(headerRow2);
            table.append(thead);
            
            // Create table body
            const tbody = $('<tbody></tbody>');
            
            // Add day rows
            const colorMap = {
                'SUN': 'text-success',
                'MON': 'text-danger',
                'TUE': 'text-success',
                'WED': 'text-warning',
                'THU': 'text-primary',
                'FRI': 'text-danger',
                'SAT': 'text-secondary'
            };
            
            data.dailyData.forEach((day, index) => {
                const rowClass = index % 2 === 0 ? '' : 'table-light';
                const dayColorClass = colorMap[day.day] || '';
                const date = new Date(day.date);
                const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear().toString().slice(2)}`;
                
                const row = $(`<tr class="${rowClass}"></tr>`);
                
                // Add date and day
                row.append(`<td>${formattedDate}</td>`);
                row.append(`<td class="${dayColorClass} fw-bold">${day.day}</td>`);
                
                // Add group data (excluding Stock)
                data.groups.forEach(group => {
                    // Skip Stock group and groups with no fields or system fields
                    if (group.label === 'Stock') return;
                    
                    const relevantFields = group.fields.filter(f => 
                        f.key !== 'date' && f.key !== 'consumption');
                    
                    if (relevantFields.length === 0) return;
                    
                    // Add field values
                    relevantFields.forEach(field => {
                        const value = day.groups[group.id]?.fields[field.key]?.value || 0;
                        row.append(`<td class="text-center">${Number(value)}</td>`);
                    });
                });
                
                // Add consumption, revenue, cost
                const consumption = Number(day.consumption);
                const revenue = Number(day.revenue);
                const costPercentage = revenue > 0 ? ((consumption / revenue) * 100) : 0;
                
                row.append(`<td class="text-center">${Core.ui.formatNumber(consumption)}</td>`);
                row.append(`<td class="text-center">${Core.ui.formatNumber(revenue)}</td>`);
                row.append(`<td class="text-center">${Core.ui.formatNumber(costPercentage)}%</td>`);
                
                tbody.append(row);
            });
            
            table.append(tbody);
            
            // Create footer with totals
            const tfoot = $('<tfoot></tfoot>');
            const totalRow = $('<tr class="fw-bold"></tr>');
            
            // Date and day total
            totalRow.append('<td colspan="2" class="text-center">TOTAL</td>');
            
            // Group totals (excluding Stock)
            data.groups.forEach(group => {
                // Skip Stock group and groups with no fields or system fields
                if (group.label === 'Stock') return;
                
                const relevantFields = group.fields.filter(f => 
                    f.key !== 'date' && f.key !== 'consumption');
                
                if (relevantFields.length === 0) return;
                
                // Add field totals
                relevantFields.forEach(field => {
                    const total = data.fieldTotals[field.id]?.total || 0;
                    totalRow.append(`<td class="text-center">${Core.ui.formatNumber(Number(total))}</td>`);
                });
            });
            
            // Add consumption, revenue, cost totals
            const totalConsumption = Number(data.summary.totalConsumption);
            const totalRevenue = Number(data.summary.totalRevenue);
            const totalCostPercentage = totalRevenue > 0 ? ((totalConsumption / totalRevenue) * 100) : 0;
            
            totalRow.append(`<td class="text-center">${Core.ui.formatNumber(totalConsumption)}</td>`);
            totalRow.append(`<td class="text-center">${Core.ui.formatNumber(totalRevenue)}</td>`);
            totalRow.append(`<td class="text-center">${Core.ui.formatNumber(totalCostPercentage)}%</td>`);
            
            tfoot.append(totalRow);
            table.append(tfoot);
            
            // Add table to container
            container.append('<h5 class="mt-3 mb-2">Cost & Revenue</h5>');
            container.append(table);
        },

        // Create Stock table
        createStockTable: function(data, container) {
            // Find the Stock group
            const stockGroup = data.groups.find(group => group.label === 'Stock');
            
            // If no Stock group found, return
            if (!stockGroup) return;
            
            // Get the stock fields
            const stockFields = stockGroup.fields.filter(f => 
                f.key !== 'date' && f.key !== 'consumption' &&
                ['purchase', 'purchase_rtn', 'transfer_in', 'transfer_out', 'opening_stock', 'closing_stock'].includes(f.key));
            
            // If no stock fields, return
            if (stockFields.length === 0) return;
            
            // Create table element
            const table = $('<table class="table table-sm table-bordered table-hover" id="stockTable"></table>');
            
            // Create the header
            const thead = $('<thead class="table-light"></thead>');
            
            // First header row - Group header
            const headerRow1 = $('<tr></tr>');
            headerRow1.append('<th rowspan="2">Date</th>');
            headerRow1.append('<th rowspan="2">Day</th>');
            headerRow1.append(`<th colspan="${stockFields.length}" class="text-center">Stock</th>`);
            
            // Second header row - Field names
            const headerRow2 = $('<tr></tr>');
            
            // Add each field header
            stockFields.forEach(field => {
                headerRow2.append(`<th class="text-center">${field.label}</th>`);
            });
            
            // Add headers to table
            thead.append(headerRow1);
            thead.append(headerRow2);
            table.append(thead);
            
            // Create table body
            const tbody = $('<tbody></tbody>');
            
            // Add day rows
            const colorMap = {
                'SUN': 'text-success',
                'MON': 'text-danger',
                'TUE': 'text-success',
                'WED': 'text-warning',
                'THU': 'text-primary',
                'FRI': 'text-danger',
                'SAT': 'text-secondary'
            };
            
            data.dailyData.forEach((day, index) => {
                const rowClass = index % 2 === 0 ? '' : 'table-light';
                const dayColorClass = colorMap[day.day] || '';
                const date = new Date(day.date);
                const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear().toString().slice(2)}`;
                
                const row = $(`<tr class="${rowClass}"></tr>`);
                
                // Add date and day
                row.append(`<td>${formattedDate}</td>`);
                row.append(`<td class="${dayColorClass} fw-bold">${day.day}</td>`);
                
                // Add stock field values
                stockFields.forEach(field => {
                    const value = day.groups[stockGroup.id]?.fields[field.key]?.value || 0;
                    row.append(`<td class="text-center">${Core.ui.formatNumber(Number(value))}</td>`);
                });
                
                tbody.append(row);
            });
            
            table.append(tbody);
            
            // Create footer with totals
            const tfoot = $('<tfoot></tfoot>');
            const totalRow = $('<tr class="fw-bold"></tr>');
            
            // Date and day total
            totalRow.append('<td colspan="2" class="text-center">TOTAL</td>');
            
            // Add stock field totals
            stockFields.forEach(field => {
                const total = data.fieldTotals[field.id]?.total || 0;
                totalRow.append(`<td class="text-center">${Core.ui.formatNumber(Number(total))}</td>`);
            });
            
            tfoot.append(totalRow);
            table.append(tfoot);
            
            // Add table to container
            container.append('<h5 class="mt-4 mb-2">Stock</h5>');
            container.append(table);
        },

        // Find rate for field
        findRateForField: function(revenueTotals, field) {
            // Find the rate for a specific field
            if (!field.customerId || !field.categoryId) return null;
            
            for (const key in revenueTotals) {
                const rev = revenueTotals[key];
                if (rev.customerId === field.customerId && rev.categoryId === field.categoryId) {
                    return rev.rate;
                }
            }
            return null;
        },

        // Download report as Excel
        downloadReportExcel: function(branchId, yearMonth) {
            const url = this.config.endpoints.reportExcel
                .replace('{branchId}', branchId)
                .replace('{yearMonth}', yearMonth);
            
            console.log('Downloading Excel report from:', `${Core.config.apiBaseUrl}${url}`);
            
            // Use fetch API for direct download
            fetch(`${Core.config.apiBaseUrl}${url}`, {
                headers: { 'Authorization': `Bearer ${Core.state.token}` }
            })
            .then(response => {
                if (response.ok) {
                    return response.blob();
                } else {
                    return response.json().then(error => {
                        throw new Error(error.error || 'Failed to download Excel');
                    });
                }
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `report-${yearMonth}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                
                // Show success message
                Core.ui.showToast('Excel report downloaded successfully');
            })
            .catch(err => {
                console.error(err);
                Core.ui.showToast(err.message || 'Failed to download Excel report', 'danger');
            });
        }
    };

    // Expose the module globally for later registration
    window.DCR = DCR;

})(window, jQuery, window.Core); 