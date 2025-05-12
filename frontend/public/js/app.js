import Core from './core/app-core.js';
import DCRModule from './modules/dcr/index.js';

class Application {
    constructor() {
        this.core = new Core();
        this.core.config.apiBaseUrl = ''; // Set your API base URL

        this.modules = {
            dcr: new DCRModule(this.core)
        };

        this.init();
    }

    async init() {
        // Initialize core
        const isAuthenticated = await this.core.init();

        if (isAuthenticated) {
            // Register modules with core
            this.registerModules();

            // Start the application
            this.core.start();
        }

        // Initial navigation setup
        this.core.services.ui.buildNavigation(
            this.modules,
            this.core.state.user
        );

        // Load initial module
        await this.core.services.router.navigateTo('dcr');
    }

    registerModules() {
        Object.entries(this.modules).forEach(([name, module]) => {
            this.core.registerModule(name, module);
        });
    }
}

// Start the application when DOM is ready
$(document).ready(() => {
    new Application();
});