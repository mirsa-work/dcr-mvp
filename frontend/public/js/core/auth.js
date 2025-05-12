export default class AuthService {
    constructor(core) {
        this.core = core;
        this.elements = {
            loginView: $('#loginView'),
            appShell: $('#appShell'),
            loginForm: $('#loginForm'),
            usernameInput: $('#username'),
            passwordInput: $('#password'),
            loginError: $('#loginError'),
            logoutBtn: $('#logoutBtn'),
            usernameDisplay: $('#usernameDisplay')
        };
    }

    async initialize() {
        this.bindEvents();
        return this.checkExistingSession();
    }

    bindEvents() {
        this.elements.loginForm.on('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        this.elements.logoutBtn.on('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });
    }

    async checkExistingSession() {
        const token = localStorage.getItem(this.core.config.localStorageKeys.token);
        if (token) {
            this.core.state.token = token;
            await this.loadUserFromStorage();
            return true;
        }
        return false;
    }

    async handleLogin() {
        const username = this.elements.usernameInput.val().trim();
        const password = this.elements.passwordInput.val();

        if (!username || !password) {
            this.showLoginError('Please enter both username and password');
            return false;
        }

        try {
            const response = await this.core.services.api.request({
                url: '/api/login',
                method: 'POST',
                data: { username, password },
                skipAuth: true
            });

            this.core.state.token = response.token;
            this.core.state.user = response.user;

            // Store credentials
            localStorage.setItem(this.core.config.localStorageKeys.token, response.token);
            localStorage.setItem(this.core.config.localStorageKeys.user, JSON.stringify(response.user));

            // Update UI
            this.elements.usernameDisplay.text(response.user.username);
            this.core.services.ui.showAppShell();

            return true;
        } catch (error) {
            this.showLoginError(error.message || 'Login failed');
            return false;
        }
    }

    handleLogout() {
        // Clear state and storage
        this.core.state.token = null;
        this.core.state.user = null;
        localStorage.removeItem(this.core.config.localStorageKeys.token);
        localStorage.removeItem(this.core.config.localStorageKeys.user);

        // Reset UI
        this.core.services.ui.showLoginView();
        this.elements.usernameInput.val('');
        this.elements.passwordInput.val('');
    }

    async loadUserFromStorage() {
        const userData = localStorage.getItem(this.core.config.localStorageKeys.user);
        if (userData) {
            try {
                this.core.state.user = JSON.parse(userData);
                this.elements.usernameDisplay.text(this.core.state.user.username);
            } catch (e) {
                console.error('Failed to parse user data from storage', e);
                this.handleLogout();
            }
        }
    }

    showLoginError(message) {
        this.elements.loginError.text(message).fadeIn();
        setTimeout(() => this.elements.loginError.fadeOut(), 3000);
    }
}