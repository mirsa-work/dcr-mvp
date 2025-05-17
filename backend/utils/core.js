/**
 * Core Utilities
 * Provides common functions for all modules
 */

const path = require('path');
const fs = require('fs');

/**
 * Standardized API response
 */
class ApiResponse {
    /**
     * Success response
     * @param {Object} data - Response data
     * @param {Number} status - HTTP status code (default 200)
     * @returns {Object} Formatted success response
     */
    static success(data, status = 200) {
        return {
            status,
            data
        };
    }

    /**
     * Error response
     * @param {String} message - Error message
     * @param {Number} status - HTTP status code (default 400)
     * @param {Array} errors - Detailed error list
     * @returns {Object} Formatted error response
     */
    static error(message, status = 400, errors = []) {
        return {
            status,
            error: message,
            errors: errors.length ? errors : undefined
        };
    }
}

/**
 * Custom error with HTTP status code
 */
class ApiError extends Error {
    constructor(message, status = 400, errors = []) {
        super(message);
        this.status = status;
        this.errors = errors;
        this.name = this.constructor.name;
    }
}

/**
 * Asynchronous error handling middleware
 * @param {Function} fn - Express route handler
 * @returns {Function} Express middleware with error handling
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('API Error:', err);
    
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    const errors = err.errors || [];
    
    res.status(status).json(ApiResponse.error(message, status, errors));
};

/**
 * Module registry for the application
 */
class ModuleRegistry {
    constructor() {
        this.modules = {};
        this.routes = [];
    }

    /**
     * Register a module
     * @param {String} name - Module name
     * @param {Object} module - Module instance with routes
     */
    register(name, module) {
        if (this.modules[name]) {
            throw new Error(`Module with name '${name}' is already registered.`);
        }
        
        this.modules[name] = module;
        
        // Register routes
        if (module.routes) {
            this.routes.push(...module.routes);
        }
        
        console.log(`Module '${name}' registered successfully`);
        return module;
    }

    /**
     * Get registered module
     * @param {String} name - Module name
     * @returns {Object} Module instance
     */
    get(name) {
        return this.modules[name];
    }

    /**
     * Get all registered routes
     * @returns {Array} Array of route objects
     */
    getRoutes() {
        return this.routes;
    }

    /**
     * Auto-discover and register modules from a directory
     * @param {String} modulesDir - Directory path for modules
     */
    discoverModules(modulesDir) {
        const moduleRoot = path.resolve(modulesDir);
        
        try {
            const items = fs.readdirSync(moduleRoot);
            
            for (const item of items) {
                const modulePath = path.join(moduleRoot, item);
                const stats = fs.statSync(modulePath);
                
                if (stats.isDirectory()) {
                    const indexPath = path.join(modulePath, 'index.js');
                    
                    if (fs.existsSync(indexPath)) {
                        // Load the module
                        const moduleExport = require(indexPath);
                        const moduleName = item.toLowerCase();
                        
                        if (moduleExport.name && moduleExport.routes) {
                            this.register(moduleExport.name, moduleExport);
                        } else {
                            console.warn(`Module at ${indexPath} does not have required properties (name, routes)`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error discovering modules:', error);
        }
    }
}

// Export utility functions and classes
module.exports = {
    ApiResponse,
    ApiError,
    asyncHandler,
    errorHandler,
    ModuleRegistry: new ModuleRegistry()
}; 