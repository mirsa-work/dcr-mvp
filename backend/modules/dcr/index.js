/**
 * DCR Module
 * Handles Daily Consumption Reports functionality
 */
const BaseModule = require('../BaseModule');
const { asyncHandler } = require('../../utils/core');
const authMiddleware = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const branchGuard = require('../../middleware/branchGuard');
const db = require('../../db');

// Import controllers
const dcrController = require('./controllers/dcrController');
const reportsController = require('./controllers/reportsController');
const formSpecController = require('./controllers/formSpecController');

class DcrModule extends BaseModule {
    constructor() {
        super('dcr', '1.0');
        this.init();
    }

    init() {
        // Register controllers
        this.registerController('dcr', dcrController);
        this.registerController('reports', reportsController);
        this.registerController('formSpec', formSpecController);

        // Register routes
        this.registerRoutes();
    }

    registerRoutes() {
        // Base path for all DCR routes
        const basePath = '/api';

        // Form Specification routes
        this.get(
            `${basePath}/form-spec`,
            [authMiddleware],
            asyncHandler(this.controllers.formSpec.getFormSpec)
        );

        // DCR routes
        this.get(
            `${basePath}/dcr/:id`,
            [authMiddleware],
            asyncHandler(this.controllers.dcr.getDcr)
        );

        this.put(
            `${basePath}/dcr/:id`,
            [authMiddleware, roleGuard('BRANCH')],
            asyncHandler(this.controllers.dcr.updateDcr)
        );

        this.post(
            `${basePath}/dcr/:id/submit`,
            [authMiddleware, roleGuard('BRANCH')],
            asyncHandler(this.controllers.dcr.submitDcr)
        );

        this.post(
            `${basePath}/dcr/:id/accept`,
            [authMiddleware, roleGuard('ADMIN')],
            asyncHandler(this.controllers.dcr.acceptDcr)
        );

        this.post(
            `${basePath}/dcr/:id/reject`,
            [authMiddleware, roleGuard('ADMIN')],
            asyncHandler(this.controllers.dcr.rejectDcr)
        );

        this.post(
            `${basePath}/dcr/:id/reopen`,
            [authMiddleware, roleGuard('ADMIN')],
            asyncHandler(this.controllers.dcr.reopenDcr)
        );

        // Branch DCR routes - add branchGuard middleware
        this.get(
            `${basePath}/branches/:branchId/dcr`,
            [authMiddleware, branchGuard('branchId')],
            asyncHandler(this.controllers.dcr.getDcrsByBranch)
        );

        this.post(
            `${basePath}/branches/:branchId/dcr`,
            [authMiddleware, roleGuard('BRANCH'), branchGuard('branchId')],
            asyncHandler(this.controllers.dcr.createDcr)
        );

        // Report routes
        this.get(
            `${basePath}/branches/:branchId/reports/:yearMonth/data`,
            [authMiddleware, roleGuard('ADMIN')],
            asyncHandler(this.controllers.reports.getReportData)
        );

        this.get(
            `${basePath}/branches/:branchId/reports/:yearMonth/pdf`,
            [authMiddleware, roleGuard('ADMIN')],
            asyncHandler(this.controllers.reports.getReportPdf)
        );
    }
}

// Create and export module instance
module.exports = new DcrModule(); 