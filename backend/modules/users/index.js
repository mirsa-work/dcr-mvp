/**
 * Users Module
 * Handles user authentication and management
 */
const BaseModule = require('../BaseModule');
const { asyncHandler } = require('../../utils/core');
const authMiddleware = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

// Import controllers
const authController = require('./controllers/authController');
const userController = require('./controllers/userController');

class UsersModule extends BaseModule {
    constructor() {
        super('users', '1.0');
        this.init();
    }

    init() {
        // Register controllers
        this.registerController('auth', authController);
        this.registerController('user', userController);

        // Register routes
        this.registerRoutes();
    }

    registerRoutes() {
        // Base path for all auth routes
        const basePath = '/api';

        // Auth routes (public)
        this.post(
            `${basePath}/login`,
            asyncHandler(this.controllers.auth.login)
        );

        // User management routes (protected)
        this.get(
            `${basePath}/me`,
            [authMiddleware],
            asyncHandler(this.controllers.user.getCurrentUser)
        );

        this.get(
            `${basePath}/users`,
            [authMiddleware, roleGuard('ADMIN')],
            asyncHandler(this.controllers.user.getAllUsers)
        );

        this.get(
            `${basePath}/users/:id`,
            [authMiddleware, roleGuard('ADMIN')],
            asyncHandler(this.controllers.user.getUserById)
        );

        this.post(
            `${basePath}/users`,
            [authMiddleware, roleGuard('ADMIN')],
            asyncHandler(this.controllers.user.createUser)
        );

        this.put(
            `${basePath}/users/:id`,
            [authMiddleware, roleGuard('ADMIN')],
            asyncHandler(this.controllers.user.updateUser)
        );

        // Password reset routes
        this.post(
            `${basePath}/change-password`,
            [authMiddleware],
            asyncHandler(this.controllers.user.changePassword)
        );

        this.post(
            `${basePath}/reset-user-password`,
            [authMiddleware, roleGuard('ADMIN')],
            asyncHandler(this.controllers.user.resetUserPassword)
        );
    }
}

// Create and export module instance
module.exports = new UsersModule(); 