/**
 * Core.js - Foundation for Southern Slice ERP
 * Provides base functionality for all modules
 */
(function(window, $) {
    'use strict';

    // Core namespace
    const Core = {
        // Configuration
        config: {
            apiBaseUrl: '',
            localStorageKeys: {
                token: 'jwt',
                user: 'user'
            }
        },

        // Current state
        state: {
            token: null,
            user: null,
            modules: {},
            modulesInitialized: false
        },

        // Initialize the core application
        init: function() {
            this.checkAuthentication();
            
            if (window.DCR) {
                console.log('Registering DCR module');
                this.module.register('dcr', window.DCR);
            }
            
            if (window.Users) {
                console.log('Registering Users module');
                this.module.register('users', window.Users);
            }

            // Ensure modules are initialized only after document is ready
            this.initializeAllModules();
        },
        
        // Central function to initialize all modules after document is ready
        initializeAllModules: function() {
            if (this.state.modulesInitialized) {
                console.log('Modules already initialized');
                return;
            }
            
            console.log('Initializing all modules centrally');
            
            // Only initialize modules if user is authenticated
            if (this.auth.isAuthenticated()) {
                // Initialize each registered module
                Object.keys(this.state.modules).forEach(moduleName => {
                    const module = this.state.modules[moduleName];
                    console.log(`Initializing module: ${moduleName}`);
                    if (module.init && typeof module.init === 'function') {
                        module.init();
                    }
                });
                
                this.state.modulesInitialized = true;
            }
        },

        // Authentication functions
        auth: {
            // Attempt login
            login: function(username, password) {
                return Core.api.post('/api/login', { username, password }, true)
                    .then(response => {
                        Core.state.token = response.token;
                        Core.state.user = response.user;

                        // Store credentials
                        localStorage.setItem(Core.config.localStorageKeys.token, response.token);
                        localStorage.setItem(Core.config.localStorageKeys.user, JSON.stringify(response.user));
                        
                        window.location.reload();

                        return response;
                    });
            },

            // Log out the user
            logout: function() {
                Core.state.token = null;
                Core.state.user = null;
                localStorage.removeItem(Core.config.localStorageKeys.token);
                localStorage.removeItem(Core.config.localStorageKeys.user);
                
                // Reload the page
                window.location.reload();
            },

            // Check if user has a specific role
            hasRole: function(role) {
                return Core.state.user && Core.state.user.role === role;
            },

            // Check if user is authenticated
            isAuthenticated: function() {
                return !!Core.state.token;
            }
        },

        // UI utilities
        ui: {
            // Show a toast notification
            showToast: function(message, type = 'success') {
                const toastId = `toast-${Date.now()}`;
                const toastClass = type === 'success' ? 'bg-success' : 'bg-danger';

                const toast = $(`
                    <div id="${toastId}" class="toast ${toastClass} text-white">
                        <div class="toast-body">${message}</div>
                    </div>
                `);

                $('#toastContainer').append(toast);

                // Show and auto-remove toast
                const bsToast = new bootstrap.Toast(toast[0], { delay: 3000 });
                bsToast.show();

                toast.on('hidden.bs.toast', () => {
                    toast.remove();
                });
            },

            // Format a date
            formatDate: function(isoDate) {
                const date = new Date(isoDate);
                return date.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
            },

            // Format a number
            formatNumber: function(num) {
                return new Intl.NumberFormat('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }).format(num);
            }
        },

        // API utilities
        api: {
            // Make a GET request
            get: function(url, skipAuth = false) {
                return Core.api.request({
                    url: url,
                    method: 'GET',
                    skipAuth: skipAuth
                });
            },

            // Make a POST request
            post: function(url, data = null, skipAuth = false) {
                return Core.api.request({
                    url: url,
                    method: 'POST',
                    data: data,
                    skipAuth: skipAuth
                });
            },

            // Make a PUT request
            put: function(url, data = null, skipAuth = false) {
                return Core.api.request({
                    url: url,
                    method: 'PUT',
                    data: data,
                    skipAuth: skipAuth
                });
            },

            // Make a DELETE request
            delete: function(url, skipAuth = false) {
                return Core.api.request({
                    url: url,
                    method: 'DELETE',
                    skipAuth: skipAuth
                });
            },

            // Generic request function
            request: function(options) {
                const defaults = {
                    url: '',
                    method: 'GET',
                    data: null,
                    skipAuth: false
                };

                const config = { ...defaults, ...options };

                return new Promise((resolve, reject) => {
                    $.ajax({
                        url: `${Core.config.apiBaseUrl}${config.url}`,
                        method: config.method,
                        contentType: 'application/json',
                        data: config.data ? JSON.stringify(config.data) : undefined,
                        headers: config.skipAuth ? {} : {
                            Authorization: `Bearer ${Core.state.token}`
                        }
                    })
                    .done(response => resolve(response))
                    .fail(xhr => {
                        const error = Core.api.parseError(xhr);
                        reject(error);
                    });
                });
            },

            // Parse API errors
            parseError: function(xhr) {
                try {
                    const response = xhr.responseJSON;

                    if (response && response.error) {
                        return new Error(response.error);
                    }

                    if (response && response.errors) {
                        return new Error(response.errors.join(', '));
                    }
                } catch (e) {
                    console.error('Error parsing API error:', e);
                }

                return new Error(xhr.statusText || 'Request failed');
            }
        },

        // Module handling
        module: {
            // Register a new module
            register: function(name, module) {
                Core.state.modules[name] = module;
                
                // Don't auto-initialize, this will be done centrally
                return module;
            },

            // Get a module by name
            get: function(name) {
                return Core.state.modules[name];
            }
        },

        // Check authentication on startup
        checkAuthentication: function() {
            const token = localStorage.getItem(this.config.localStorageKeys.token);
            
            if (token) {
                this.state.token = token;
                
                try {
                    const userData = localStorage.getItem(this.config.localStorageKeys.user);
                    if (userData) {
                        this.state.user = JSON.parse(userData);
                    }
                } catch (e) {
                    console.error('Failed to parse user data', e);
                    this.auth.logout();
                }
            }
        }
    };

    // Make Core available globally
    window.Core = Core;

    // Initialize on document ready
    $(document).ready(() => {
        Core.init();
    });

})(window, jQuery); 