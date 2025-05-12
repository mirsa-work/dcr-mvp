import dashboardTemplate from './views/templates/dashboard.js';
import dcrRowTemplate from './views/templates/dcr-table-row.js';
import dcrFormTemplate from './views/templates/dcr-form.js';
import modalTemplate from './views/templates/modal-wrapper.js';

export default class DCRModule {
    constructor(core) {
        this.core = core;
        this.id = 'dcr';
        this.name = 'Daily Consumption Reports';
        this.icon = 'bi-clipboard-data';
        this.navOrder = 1; // Control menu item order
        this.defaultPath = '/dcr';
        this.requiredRole = 'BRANCH'; // Minimum role required to access this module
        this.modal = null; // Will hold Bootstrap Modal instance

        this.state = {
            branches: [],
            formSpecs: {}, // Cached by branch code
            editId: null,
            dataTable: null
        };

        this.elements = {};
    }

    /**
     * Non-DOM initialization (data loading, state setup)
     */
    async preRenderInit() {
        // Set up non-DOM state
        const today = new Date();
        this.state.currentMonth = today.toISOString().slice(0, 7);

        this.modal = null; // Will be lazy-initialized
    }

    /**
     * DOM-dependent initialization
     */
    async postRenderInit() {
        // Cache elements
        this.elements = {
            branchSelect: $('#branchSelect'),
            monthSelect: $('#monthSelect'),
            refreshBtn: $('#refreshBtn'),
            newDcrBtn: $('#newDcrBtn'),
            dcrTable: $('#dcrTable')
        };

        await this.loadBranches();

        // Set initial UI state
        this.elements.monthSelect.val(this.state.currentMonth);

        // Bind event handlers
        this.bindEvents();

        // Load initial table data
        await this.loadDcrTable();
    }

    bindEvents() {
        // Dashboard events
        this.elements.branchSelect.on('change', () => this.handleBranchChange());
        this.elements.monthSelect.on('change', () => this.loadDcrTable());
        this.elements.refreshBtn.on('click', () => this.loadDcrTable());
        this.elements.newDcrBtn.on('click', () => this.openDcrModal(null));

        // Table actions (delegated to static parent)
        $(document).on('click', '#dcrTable .action-btn', (e) => {
            const action = $(e.target).data('action');
            const dcrId = $(e.target).closest('tr').data('id');
            this.handleDcrAction(action, dcrId);
        });

        // Form submission (delegated to document since modal is dynamic)
        $(document).on('click', '#saveDcrBtn', () => this.saveDcr());
    }

    async render(container, path) {
        container.html(dashboardTemplate);
    }

    // ─── DCR Data Methods ──────────────────────────────────

    async loadBranches() {
        try {
            const branches = await this.core.services.api.request({
                url: '/api/branches'
            });

            this.state.branches = branches;
            this.populateBranchSelect(branches);

            if (branches.length > 0) {
                return this.ensureFormSpec(branches[0].id, branches[0].code);
            }
        } catch (error) {
            this.core.services.ui.showToast('Failed to load branches', 'danger');
            console.error('Branch load error:', error);
            throw error;
        }
    }

    populateBranchSelect(branches) {
        const select = this.elements.branchSelect.empty();

        branches.forEach(branch => {
            select.append(
                `<option value="${branch.id}" data-code="${branch.code}">${branch.name}</option>`
            );
        });
    }

    async ensureFormSpec(branchId, branchCode) {
        if (this.state.formSpecs[branchCode]) {
            return;
        }

        try {
            const spec = await this.core.services.api.request({
                url: `/api/form-spec?branchId=${branchId}`
            });

            this.state.formSpecs[branchCode] = spec;
        } catch (error) {
            console.error('Failed to load form spec:', error);
            throw error;
        }
    }

    async loadDcrTable() {
        const branchId = this.elements.branchSelect.val();
        const month = this.elements.monthSelect.val();

        try {
            const data = await this.core.services.api.request({
                url: `/api/branches/${branchId}/dcr?month=${month}`
            });

            this.renderDcrTable(data);
        } catch (error) {
            this.core.services.ui.showToast('Failed to load DCR data', 'danger');
            console.error('DCR table load error:', error);
        }
    }

    renderDcrTable(rows) {
        if (this.state.dataTable) {
            this.state.dataTable.destroy();
            this.state.dataTable = null;
        }

        const tableBody = this.elements.dcrTable.find('tbody').empty();

        rows.forEach(row => {
            tableBody.append(this.createDcrTableRow(row));
        });

        this.state.dataTable = new DataTable('#dcrTable', {
            pageLength: 10,
            order: [[0, 'desc']],
            responsive: true
        });
    }

    createDcrTableRow(dcr) {
        return dcrRowTemplate
            .replace('{{id}}', dcr.id)
            .replace('{{date}}', this.formatDate(dcr.dcr_date))
            .replace('{{dcr_number}}', dcr.dcr_number)
            .replaceAll('{{status}}', dcr.status)
            .replace('{{actions}}', this.createActionButtons(dcr));
    }

    createActionButtons(dcr) {
        const actions = [];
        const isBranchUser = this.core.state.user.role === 'BRANCH';
        const isAdminUser = this.core.state.user.role === 'ADMIN';

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
    }

    createActionButton(icon, action, title) {
        return `<i class="bi bi-${icon} action-btn" data-action="${action}" title="${title}"></i>`;
    }

    // ─── DCR Actions ───────────────────────────────────────

    handleDcrAction(action, dcrId) {
        const actions = {
            edit: () => this.openDcrModal(dcrId),
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
    }

    async updateDcrStatus(dcrId, action, data = {}) {
        try {
            await this.core.services.api.request({
                url: `/api/dcr/${dcrId}/${action}`,
                method: 'POST',
                data: data
            });

            this.core.services.ui.showToast(`DCR ${action} successful`);
            this.loadDcrTable();
        } catch (error) {
            this.core.services.ui.showToast(`Failed to ${action} DCR`, 'danger');
            console.error(`DCR ${action} error:`, error);
        }
    }

    // ─── DCR Form Handling ────────────────────────────────

    createModal() {
        // Create modal DOM element dynamically
        const modalHtml = modalTemplate.replace('{{content}}', '');
        $('body').append(modalHtml);

        // Initialize Bootstrap modal
        this.modal = new bootstrap.Modal('#dcrModal');

        // Cache modal elements
        this.elements.dcrModalContent = $('#dcrModalContent');
    }

    async openDcrModal(dcrId) {
        // Ensure modal exists
        if (!this.modal) {
            this.createModal();
        }

        this.state.editId = dcrId;
        const branchCode = this.elements.branchSelect.find('option:selected').data('code');
        const formSpec = this.state.formSpecs[branchCode];

        if (!formSpec) {
            this.core.services.ui.showToast('No form specification available for this branch', 'danger');
            return;
        }

        const formGroups = this.buildFormGroups(formSpec);
        const modalContent = dcrFormTemplate
            .replace('{{title}}', dcrId ? 'Edit DCR' : 'New Daily Consumption Report')
            .replace('{{{formGroups}}}', formGroups);

        // Update modal content
        this.elements.dcrModalContent.html(modalContent);
        this.elements.dcrForm = $('#dcrForm');

        if (dcrId) {
            await this.loadDcrData(dcrId);
        }

        this.modal.show();
    }

    buildFormGroups(formSpec) {
        let html = '';
        const groups = formSpec.groups || [{
            label: '',
            fields: Array.isArray(formSpec) ? formSpec : formSpec.fields || []
        }];

        groups.forEach(group => {
            if (group.label) {
                html += `
          <div class="col-12 form-section">
            <h6 class="form-section-header">${group.label}</h6>
            <hr class="mt-0 mb-2">
          </div>
        `;
            }

            group.fields.forEach(field => {
                const inputType = field.type === 'date' ? 'date' : 'number';
                const step = field.type === 'decimal' ? '0.01' : '1';

                html += `
          <div class="col-md-4">
            <label class="form-label">
              ${field.label}${field.required ? '<span class="text-danger">*</span>' : ''}
            </label>
            <input class="form-control" 
                  type="${inputType}" 
                  step="${step}" 
                  name="${field.key}" 
                  ${field.required ? 'required' : ''}>
          </div>
        `;
            });
        });

        return html;
    }

    async loadDcrData(dcrId) {
        try {
            const dcr = await this.core.services.api.request({
                url: `/api/dcr/${dcrId}`
            });

            this.populateDcrForm(dcr);
        } catch (error) {
            this.core.services.ui.showToast('Failed to load DCR data', 'danger');
            console.error('DCR load error:', error);
        }
    }

    populateDcrForm(dcr) {
        Object.entries(dcr).forEach(([key, value]) => {
            const input = this.elements.dcrForm.find(`[name="${key}"]`);

            if (input.length) {
                input.val(key === 'date' ? value.slice(0, 10) : value);
            }
        });
    }

    async saveDcr() {
        // Get fresh reference to form elements
        const form = $('#dcrForm');
        const saveBtn = $('#saveDcrBtn');

        if (!form[0].reportValidity()) {
            return;
        }

        const formData = this.serializeForm(form);
        const branchId = this.elements.branchSelect.val();

        try {
            saveBtn.prop('disabled', true);

            const request = this.state.editId
                ? {
                    url: `/api/dcr/${this.state.editId}`,
                    method: 'PUT'
                }
                : {
                    url: `/api/branches/${branchId}/dcr`,
                    method: 'POST'
                };

            await this.core.services.api.request({
                ...request,
                data: formData
            });

            this.modal.hide();
            this.core.services.ui.showToast('DCR saved successfully');
            this.loadDcrTable();
        } catch (error) {
            const errorMessage = error.message || 'Failed to save DCR';
            this.core.services.ui.showToast(errorMessage, 'danger');
            console.error('DCR save error:', error);
        } finally {
            saveBtn.prop('disabled', false);
        }
    }

    serializeForm(form) {
        return Object.fromEntries(
            form.serializeArray().map(item => [item.name, item.value])
        );
    }

    // ─── Utility Methods ──────────────────────────────────

    formatDate(isoDate) {
        const date = new Date(isoDate);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    handleBranchChange() {
        const branchId = this.elements.branchSelect.val();
        const branchCode = this.elements.branchSelect.find('option:selected').data('code');

        this.ensureFormSpec(branchId, branchCode)
            .then(() => this.loadDcrTable())
            .catch(error => {
                this.core.services.ui.showToast('Failed to load branch specification', 'danger');
                console.error('Branch change error:', error);
            });
    }

    // Required module interface method
    isAvailableForUser(user) {
        return ['BRANCH', 'ADMIN', 'VIEWER'].includes(user?.role);
    }

    cleanup() {
        // Remove modal from DOM when module is unloaded
        if (this.modal) {
            this.modal.dispose();
            $('#dcrModal').remove();
            this.modal = null;
        }
    }
}