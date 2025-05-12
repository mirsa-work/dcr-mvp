import AuthService from './auth.js';
import ApiService from './api.js';
import UIService from './ui.js';
import RouterService from './router.js';

export default class Core {
    constructor() {
        this.config = {
            apiBaseUrl: '', // Set this during application initialization
            localStorageKeys: {
                token: 'jwt',
                user: 'user'
            },
            modules: {
                dcr: {
                    path: '/dcr',
                    icon: 'bi-clipboard-data'
                }
            }
        };

        this.state = {
            token: null,
            user: null,
            currentModule: null
        };

        // Initialize core services
        this.services = {
            auth: new AuthService(this),
            api: new ApiService(this),
            router: new RouterService(this),
            ui: new UIService(this)
        };
    }

    async init() {
        // Initialize auth service first
        const isAuthenticated = await this.services.auth.initialize();

        if (isAuthenticated) {
            // Initialize other services
            await this.services.router.initialize();
            await this.services.ui.initialize();

            // Show application shell
            this.services.ui.showAppShell();
            return true;
        }

        // Show login view if not authenticated
        this.services.ui.showLoginView();
        return false;
    }

    registerModule(name, module) {
        if (!this.config.modules[name]) {
            this.config.modules[name] = {
                path: module.defaultPath || `/${name}`,
                icon: module.icon || 'bi-collection'
            };
        }

        this.services.router.registerModule(name, module);
    }

    async start() {
        // Load the default module based on user permissions
        const availableModules = Object.keys(this.config.modules).filter(moduleName => {
            const module = this.services.router.getModule(moduleName);
            return module.isAvailableForUser(this.state.user);
        });

        if (availableModules.length > 0) {
            // Navigate to first available module (or remember last visited)
            this.services.router.navigateTo(availableModules[0]);
        } else {
            this.services.ui.showToast('No modules available for your role', 'warning');
        }
    }
}