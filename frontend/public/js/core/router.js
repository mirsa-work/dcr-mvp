export default class RouterService {
    constructor(core) {
        this.core = core;
        this.modules = {};
        this.currentModule = null;
        this.initialized = false;
    }

    async initialize() {
        this.initialized = true;
        // Set up any route listeners
        $(document).on('click', '[data-module]', (e) => {
            e.preventDefault();
            const moduleId = $(e.currentTarget).data('module');
            this.navigateTo(moduleId);
        });

        return Promise.resolve();
    }

    registerModule(name, module) {
        this.modules[name] = module;
    }

    getModule(name) {
        return this.modules[name];
    }

    async navigateTo(moduleId, path = '') {
        if (this.currentModule === moduleId) return;

        const module = this.modules[moduleId];
        if (!module) {
            console.error(`Module ${moduleId} not found`);
            return;
        }

        // Unload current module if exists
        if (this.currentModule) {
            const previousModule = this.modules[this.currentModule];
            if (previousModule.cleanup) {
                previousModule.cleanup();
            }
        }

        try {
            // Phase 1: Non-DOM initialization
            if (!module.preRenderDone) {
                await module.preRenderInit();
                module.preRenderDone = true;
            }

            // Phase 2: Render base structure
            const container = this.core.services.ui.elements.moduleContainer;
            module.render(container);

            // Phase 3: DOM-dependent initialization
            await module.postRenderInit();

            this.currentModule = moduleId;
            this.core.services.ui.updateModuleHeader(module);

            // After successful navigation:
            this.core.services.ui.updateActiveNavItem();
            this.core.services.ui.buildNavigation(
                this.modules,
                this.core.state.user
            );
        } catch (error) {
            console.error(`Module ${moduleId} failed:`, error);
            this.core.services.ui.showToast(`Failed to load ${module.name}`, 'danger');
        }
    }
}