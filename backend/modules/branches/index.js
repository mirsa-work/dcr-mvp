/**
 * Branches Module
 * Handles branch management functionality
 */
const BaseModule = require('../BaseModule');
const { asyncHandler } = require('../../utils/core');
const authMiddleware = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

// Import controllers
const branchController = require('./controllers/branchController');

class BranchesModule extends BaseModule {
    constructor() {
        super('branches', '1.0');
        this.init();
    }

    init() {
        // Register controllers
        this.registerController('branch', branchController);

        // Register routes
        this.registerRoutes();
    }

    registerRoutes() {
        // Base path for all branch routes
        const basePath = '/api';

        // Branch routes
        this.get(
            `${basePath}/branches`,
            [authMiddleware],
            asyncHandler(this.controllers.branch.getAllBranches)
        );

        this.get(
            `${basePath}/branches/:id`,
            [authMiddleware],
            asyncHandler(this.controllers.branch.getBranchById)
        );

        this.post(
            `${basePath}/branches`,
            [authMiddleware, roleGuard('ADMIN')],
            asyncHandler(this.controllers.branch.createBranch)
        );

        this.put(
            `${basePath}/branches/:id`,
            [authMiddleware, roleGuard('ADMIN')],
            asyncHandler(this.controllers.branch.updateBranch)
        );
    }
}

// Create and export module instance
module.exports = new BranchesModule(); 