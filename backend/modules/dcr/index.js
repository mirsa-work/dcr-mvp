/**
 * DCR Module
 * Handles Daily Consumption Reports functionality
 */
const BaseModule = require('../BaseModule');
const { asyncHandler } = require('../../utils/core');
const authMiddleware = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const branchGuard = require('../../middleware/branchGuard');
const { z } = require('zod');
const validate = require('../../middleware/validate');
const { createDcrBody, updateDcrBody } = require('../../schemas/dcrSchemas');

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
            [authMiddleware, validate({ params: z.object({ id: z.coerce.number().int() }) })],
            asyncHandler(this.controllers.dcr.getDcr)
        );

        this.put(
            `${basePath}/dcr/:id`,
            [authMiddleware, roleGuard('BRANCH'), validate({ params: z.object({ id: z.coerce.number().int() }), body: updateDcrBody })],
            asyncHandler(this.controllers.dcr.updateDcr)
        );

        this.post(
            `${basePath}/dcr/:id/submit`,
            [authMiddleware, roleGuard('BRANCH'), validate({ params: z.object({ id: z.coerce.number().int() }) })],
            asyncHandler(this.controllers.dcr.submitDcr)
        );

        this.post(
            `${basePath}/dcr/:id/accept`,
            [authMiddleware, roleGuard('ADMIN'), validate({ params: z.object({ id: z.coerce.number().int() }) })],
            asyncHandler(this.controllers.dcr.acceptDcr)
        );

        this.post(
            `${basePath}/dcr/:id/reject`,
            [authMiddleware, roleGuard('ADMIN'), validate({ params: z.object({ id: z.coerce.number().int() }) })],
            asyncHandler(this.controllers.dcr.rejectDcr)
        );

        this.post(
            `${basePath}/dcr/:id/reopen`,
            [authMiddleware, roleGuard('ADMIN'), validate({ params: z.object({ id: z.coerce.number().int() }) })],
            asyncHandler(this.controllers.dcr.reopenDcr)
        );

        // Branch DCR routes - add branchGuard middleware
        this.get(
            `${basePath}/branches/:branchId/dcr`,
            [authMiddleware, branchGuard('branchId'), validate({ params: z.object({ branchId: z.coerce.number().int() }) })],
            asyncHandler(this.controllers.dcr.getDcrsByBranch)
        );

        this.post(
            `${basePath}/branches/:branchId/dcr`,
            [authMiddleware, roleGuard('BRANCH'), branchGuard('branchId'), validate({ params: z.object({ branchId: z.coerce.number().int() }), body: createDcrBody })],
            asyncHandler(this.controllers.dcr.createDcr)
        );

        // Report routes
        this.get(
            `${basePath}/branches/:branchId/reports/:yearMonth/data`,
            [authMiddleware, roleGuard('ADMIN'), validate({ params: z.object({ branchId: z.coerce.number().int(), yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }) })],
            asyncHandler(this.controllers.reports.getReportData)
        );

        this.get(
            `${basePath}/branches/:branchId/reports/:yearMonth/pdf`,
            [authMiddleware, roleGuard('ADMIN'), validate({ params: z.object({ branchId: z.coerce.number().int(), yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }) })],
            asyncHandler(this.controllers.reports.getReportPdf)
        );

        this.get(
            `${basePath}/branches/:branchId/reports/:yearMonth/excel`,
            [authMiddleware, roleGuard('ADMIN'), validate({ params: z.object({ branchId: z.coerce.number().int(), yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }) })],
            asyncHandler(this.controllers.reports.getReportExcel)
        );
    }
}

// Create and export module instance
module.exports = new DcrModule(); 