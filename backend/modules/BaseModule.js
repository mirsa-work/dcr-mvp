/**
 * BaseModule
 * Provides core functionality that all modules should implement
 */
class BaseModule {
    /**
     * Create a new module
     * @param {String} name - Module name
     * @param {String} version - Module version
     */
    constructor(name, version = '1.0') {
        this.name = name;
        this.version = version;
        this.routes = [];
        this.dependencies = []; // Names of other modules this depends on
        this.models = {};
        this.services = {};
        this.controllers = {};
    }

    /**
     * Initialize module
     * This should be overridden by module implementations
     */
    init() {
        throw new Error('Module must implement init() method');
    }

    /**
     * Register a route
     * @param {String} method - HTTP method (GET, POST, etc)
     * @param {String} path - URL path
     * @param {Array} middleware - Express middleware
     * @param {Function} handler - Route handler
     */
    registerRoute(method, path, middleware, handler) {
        this.routes.push({
            method: method.toLowerCase(),
            path,
            middleware: Array.isArray(middleware) ? middleware : [middleware],
            handler
        });
    }

    /**
     * Register a GET route
     * @param {String} path - URL path
     * @param {Array|Function} middleware - Express middleware
     * @param {Function} handler - Route handler
     */
    get(path, middleware, handler) {
        if (!handler && typeof middleware === 'function') {
            handler = middleware;
            middleware = [];
        }
        this.registerRoute('get', path, middleware, handler);
    }

    /**
     * Register a POST route
     * @param {String} path - URL path
     * @param {Array|Function} middleware - Express middleware
     * @param {Function} handler - Route handler
     */
    post(path, middleware, handler) {
        if (!handler && typeof middleware === 'function') {
            handler = middleware;
            middleware = [];
        }
        this.registerRoute('post', path, middleware, handler);
    }

    /**
     * Register a PUT route
     * @param {String} path - URL path
     * @param {Array|Function} middleware - Express middleware
     * @param {Function} handler - Route handler
     */
    put(path, middleware, handler) {
        if (!handler && typeof middleware === 'function') {
            handler = middleware;
            middleware = [];
        }
        this.registerRoute('put', path, middleware, handler);
    }

    /**
     * Register a DELETE route
     * @param {String} path - URL path
     * @param {Array|Function} middleware - Express middleware
     * @param {Function} handler - Route handler
     */
    delete(path, middleware, handler) {
        if (!handler && typeof middleware === 'function') {
            handler = middleware;
            middleware = [];
        }
        this.registerRoute('delete', path, middleware, handler);
    }

    /**
     * Register a dependency
     * @param {String} moduleName - Name of the module this depends on
     */
    registerDependency(moduleName) {
        if (!this.dependencies.includes(moduleName)) {
            this.dependencies.push(moduleName);
        }
    }

    /**
     * Register a model
     * @param {String} name - Model name
     * @param {Object} model - Model implementation
     */
    registerModel(name, model) {
        this.models[name] = model;
    }

    /**
     * Register a service
     * @param {String} name - Service name
     * @param {Object} service - Service implementation
     */
    registerService(name, service) {
        this.services[name] = service;
    }

    /**
     * Register a controller
     * @param {String} name - Controller name
     * @param {Object} controller - Controller implementation
     */
    registerController(name, controller) {
        this.controllers[name] = controller;
    }
}

module.exports = BaseModule; 