export default class UIService {
    constructor(core) {
        this.core = core;
        this.elements = {
            loginView: $('#loginView'),
            appShell: $('#appShell'),
            moduleContainer: $('#moduleContainer'),
            moduleTitle: $('#moduleTitle'),
            moduleIcon: $('#moduleIcon'),
            mainNav: $('#mainNav'),
            toastContainer: $('#toastContainer')
        };
    }

    async initialize() {
        // Wait for router to be ready
        await this.core.services.router.initialize();
        return this;
    }

    showAppShell() {
        this.elements.loginView.addClass('d-none');
        this.elements.appShell.removeClass('d-none');
    }

    showLoginView() {
        this.elements.loginView.removeClass('d-none');
        this.elements.appShell.addClass('d-none');
    }

    updateModuleHeader(module) {
        this.elements.moduleTitle.text(module.name);
        this.elements.moduleIcon
            .removeClass()
            .addClass(`bi ${module.icon} me-2`);
    }

    buildNavigation(modules) {
        const nav = this.elements.mainNav.empty();

        // Get user from core state
        const currentUser = this.core.state.user;

        // Filter modules based on user permissions
        const accessibleModules = Object.values(modules)
            .filter(module => module.isAvailableForUser(currentUser))
            .sort((a, b) => a.navOrder - b.navOrder); // Add navOrder to modules if needed

        accessibleModules.forEach(module => {
            nav.append(`
        <li class="nav-item">
          <a class="nav-link ${this.core.services.router.currentModule === module.id ? 'active' : ''}" 
             href="#" 
             data-module="${module.id}">
            <i class="bi ${module.icon} me-2"></i>
            ${module.name}
          </a>
        </li>
      `);
        });

        // Highlight active module
        this.updateActiveNavItem();
    }

    updateActiveNavItem() {
        $('#mainNav .nav-link').removeClass('active');
        $(`#mainNav .nav-link[data-module="${this.core.services.router.currentModule}"]`).addClass('active');
    }

    showToast(message, type = 'success') {
        const toastId = `toast-${Date.now()}`;
        const toastClass = type === 'success' ? 'bg-success' : 'bg-danger';

        const toast = $(`
      <div id="${toastId}" class="toast ${toastClass} text-white">
        <div class="toast-body">${message}</div>
      </div>
    `);

        this.elements.toastContainer.append(toast);

        // Show and auto-remove toast
        const bsToast = new bootstrap.Toast(toast[0], { delay: 3000 });
        bsToast.show();

        toast.on('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}