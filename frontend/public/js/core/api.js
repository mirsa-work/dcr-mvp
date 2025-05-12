export default class ApiService {
    constructor(core) {
        this.core = core;
    }

    async request(options) {
        const defaults = {
            url: '',
            method: 'GET',
            data: null,
            skipAuth: false
        };

        const config = { ...defaults, ...options };

        try {
            const response = await $.ajax({
                url: `${this.core.config.apiBaseUrl}${config.url}`,
                method: config.method,
                contentType: 'application/json',
                data: config.data ? JSON.stringify(config.data) : undefined,
                headers: config.skipAuth ? {} : {
                    Authorization: `Bearer ${this.core.state.token}`
                }
            });

            return response;
        } catch (xhr) {
            throw this.parseApiError(xhr);
        }
    }

    parseApiError(xhr) {
        try {
            const response = xhr.responseJSON;

            if (response?.error) {
                return new Error(response.error);
            }

            if (response?.errors) {
                return new Error(response.errors.join(', '));
            }
        } catch (e) {
            console.error('Error parsing API error:', e);
        }

        return new Error(xhr.statusText || 'Request failed');
    }
}