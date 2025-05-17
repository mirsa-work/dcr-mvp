/**
 * Users Module - Handles user profile and password management
 */
(function(window, $, Core) {
    'use strict';

    // Users module definition
    const Users = {
        // Module configuration
        config: {
            endpoints: {
                changePassword: '/api/change-password',
                resetUserPassword: '/api/reset-user-password',
                users: '/api/users'
            },
            selectors: {
                modals: {
                    changePassword: '#changePasswordModal',
                    resetPassword: '#resetPasswordModal'
                },
                forms: {
                    changePassword: '#changePasswordForm',
                    resetPassword: '#resetPasswordForm'
                },
                buttons: {
                    openChangePassword: '#openChangePasswordBtn',
                    openResetPassword: '#openResetPasswordBtn',
                    submitChangePassword: '#changePasswordSubmitBtn',
                    submitResetPassword: '#resetPasswordSubmitBtn'
                },
                fields: {
                    userSelect: '#resetUserSelect',
                    currentPassword: '#currentPassword',
                    newPassword: '#newPassword',
                    confirmPassword: '#confirmPassword',
                    generatedPassword: '#generatedPassword'
                }
            }
        },

        // Module state
        state: {
            users: [],
            initialized: false
        },

        // Initialize the Users module
        init: function() {
            console.log('Users module initializing');
            this.createUIElements();
            this.setupEventListeners();
            
            // Mark as initialized
            this.state.initialized = true;
            return this;
        },

        // Create UI elements for password management
        createUIElements: function() {
            console.log('Creating user management UI elements');
            
            // The modals are now statically added to dashboard.html
            // Just add navigation buttons to user dropdown
            this.addNavigationButtons();
            
            // Log UI elements status
            console.log('Change password modal exists:', $(this.config.selectors.modals.changePassword).length > 0);
            console.log('Reset password modal exists:', $(this.config.selectors.modals.resetPassword).length > 0);
            console.log('Change password button exists:', $(this.config.selectors.buttons.openChangePassword).length > 0);
            console.log('Reset password button exists:', $(this.config.selectors.buttons.openResetPassword).length > 0);
        },
        
        // Inject change password modal
        injectChangePasswordModal: function() {
            const modal = `
                <div class="modal fade" id="changePasswordModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Change Password</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="changePasswordForm">
                                    <div class="mb-3">
                                        <label for="currentPassword" class="form-label">Current Password</label>
                                        <input type="password" class="form-control" id="currentPassword" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="newPassword" class="form-label">New Password</label>
                                        <input type="password" class="form-control" id="newPassword" required minlength="6">
                                        <div class="form-text">Password must be at least 6 characters long</div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="confirmPassword" class="form-label">Confirm New Password</label>
                                        <input type="password" class="form-control" id="confirmPassword" required>
                                    </div>
                                    <div id="changePasswordError" class="text-danger d-none mb-3"></div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" id="changePasswordSubmitBtn" class="btn btn-primary">Change Password</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('body').append(modal);
        },
        
        // Inject reset password modal (admin only)
        injectResetPasswordModal: function() {
            const modal = `
                <div class="modal fade" id="resetPasswordModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Reset User Password</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="resetPasswordForm">
                                    <div class="mb-3">
                                        <label for="resetUserSelect" class="form-label">Select User</label>
                                        <select class="form-select" id="resetUserSelect" required></select>
                                    </div>
                                    <div id="generatedPasswordContainer" class="mb-3 d-none">
                                        <label for="generatedPassword" class="form-label">Generated Password</label>
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="generatedPassword" readonly>
                                            <button class="btn btn-outline-secondary" type="button" id="copyPasswordBtn">
                                                <i class="bi bi-clipboard"></i>
                                            </button>
                                        </div>
                                        <div class="form-text text-warning">
                                            Please copy this password and provide it to the user. This is the only time it will be displayed.
                                        </div>
                                    </div>
                                    <div id="resetPasswordError" class="text-danger d-none mb-3"></div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" id="resetPasswordSubmitBtn" class="btn btn-primary">Reset Password</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('body').append(modal);
        },
        
        // Add navigation buttons to user dropdown
        addNavigationButtons: function() {
            console.log('Adding user management navigation buttons');
            
            // Find the dropdown menu
            const $dropdown = $('.dropdown-menu.dropdown-menu-end');
            
            // Only add links if dropdown exists and buttons don't already exist
            if ($dropdown.length && $('#openChangePasswordBtn').length === 0) {
                // Clear existing items and prepare to rebuild
                $dropdown.empty();
                
                // Add change password option
                $dropdown.append(`
                    <li><a class="dropdown-item" id="openChangePasswordBtn" href="#">
                        <i class="bi bi-key me-2"></i>Change Password
                    </a></li>
                `);
                
                // Add reset password option for admins
                if (Core.auth.hasRole('ADMIN')) {
                    $dropdown.append(`
                        <li><a class="dropdown-item" id="openResetPasswordBtn" href="#">
                            <i class="bi bi-person-gear me-2"></i>Reset User Password
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                    `);
                } else {
                    // Add divider for non-admin users
                    $dropdown.append(`<li><hr class="dropdown-divider"></li>`);
                }
                
                // Add logout button at the end
                $dropdown.append(`
                    <li><a class="dropdown-item" id="logoutBtn" href="#">
                        <i class="bi bi-box-arrow-right me-2"></i>Logout
                    </a></li>
                `);
                
                // Re-add click handler for logout
                $('#logoutBtn').on('click', () => Core.auth.logout());
            }
        },

        // Set up event listeners
        setupEventListeners: function() {
            console.log('Setting up user management event listeners');
            
            // Change Password Modal
            $(document).on('click', this.config.selectors.buttons.openChangePassword, (e) => {
                e.preventDefault();
                console.log('Change password button clicked');
                this.openChangePasswordModal();
            });
            
            $(document).on('click', this.config.selectors.buttons.submitChangePassword, (e) => {
                e.preventDefault();
                console.log('Submit change password button clicked');
                this.submitChangePassword();
            });
            
            $(document).on('keyup', this.config.selectors.fields.confirmPassword, () => {
                this.validatePasswordMatch();
            });
            
            // Reset Password Modal (Admin only)
            if (Core.auth.hasRole('ADMIN')) {
                $(document).on('click', this.config.selectors.buttons.openResetPassword, (e) => {
                    e.preventDefault();
                    console.log('Reset password button clicked');
                    this.openResetPasswordModal();
                });
                
                $(document).on('click', this.config.selectors.buttons.submitResetPassword, (e) => {
                    e.preventDefault();
                    console.log('Submit reset password button clicked');
                    this.submitResetPassword();
                });
                
                $(document).on('click', '#copyPasswordBtn', (e) => {
                    e.preventDefault();
                    console.log('Copy password button clicked');
                    this.copyToClipboard($(this.config.selectors.fields.generatedPassword).val());
                });
            }
        },
        
        // Open change password modal
        openChangePasswordModal: function() {
            // Reset form
            $(this.config.selectors.forms.changePassword)[0].reset();
            
            // Hide error message
            $('#changePasswordError').addClass('d-none');
            
            // Show modal
            const modal = new bootstrap.Modal($(this.config.selectors.modals.changePassword)[0]);
            modal.show();
        },
        
        // Validate password match
        validatePasswordMatch: function() {
            const newPassword = $(this.config.selectors.fields.newPassword).val();
            const confirmPassword = $(this.config.selectors.fields.confirmPassword).val();
            
            if (newPassword && confirmPassword && newPassword !== confirmPassword) {
                $('#changePasswordError')
                    .text('Passwords do not match')
                    .removeClass('d-none');
                return false;
            } else {
                $('#changePasswordError').addClass('d-none');
                return true;
            }
        },
        
        // Submit change password
        submitChangePassword: function() {
            // Validate form
            const form = $(this.config.selectors.forms.changePassword)[0];
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            // Validate password match
            if (!this.validatePasswordMatch()) {
                return;
            }
            
            const currentPassword = $(this.config.selectors.fields.currentPassword).val();
            const newPassword = $(this.config.selectors.fields.newPassword).val();
            
            // Submit to API
            Core.api.post(this.config.endpoints.changePassword, {
                currentPassword,
                newPassword
            })
            .then(() => {
                // Close modal
                bootstrap.Modal.getInstance($(this.config.selectors.modals.changePassword)[0]).hide();
                
                // Show success toast
                Core.ui.showToast('Password changed successfully');
            })
            .catch(error => {
                // Show error
                $('#changePasswordError')
                    .text(error.message || 'Failed to change password')
                    .removeClass('d-none');
            });
        },
        
        // Open reset password modal (admin only)
        openResetPasswordModal: function() {
            // Reset form
            $(this.config.selectors.forms.resetPassword)[0].reset();
            
            // Hide generated password section
            $('#generatedPasswordContainer').addClass('d-none');
            
            // Hide error message
            $('#resetPasswordError').addClass('d-none');
            
            // Load users for select box
            this.loadUsers();
            
            // Show modal
            const modal = new bootstrap.Modal($(this.config.selectors.modals.resetPassword)[0]);
            modal.show();
        },
        
        // Load users for select dropdown
        loadUsers: function() {
            Core.api.get(this.config.endpoints.users)
                .then(users => {
                    this.state.users = users;
                    
                    const $select = $(this.config.selectors.fields.userSelect).empty();
                    $select.append('<option value="">Select a user</option>');
                    
                    users.forEach(user => {
                        $select.append(`<option value="${user.id}">${user.username} (${user.role})</option>`);
                    });
                })
                .catch(error => {
                    $('#resetPasswordError')
                        .text(error.message || 'Failed to load users')
                        .removeClass('d-none');
                });
        },
        
        // Submit reset password (admin only)
        submitResetPassword: function() {
            // Validate form
            const form = $(this.config.selectors.forms.resetPassword)[0];
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const userId = $(this.config.selectors.fields.userSelect).val();
            
            // Submit to API
            Core.api.post(this.config.endpoints.resetUserPassword, { userId })
                .then(response => {
                    // Show generated password
                    $(this.config.selectors.fields.generatedPassword).val(response.newPassword);
                    $('#generatedPasswordContainer').removeClass('d-none');
                    
                    // Hide submit button and show success
                    $(this.config.selectors.buttons.submitResetPassword).hide();
                    
                    // Show success message
                    Core.ui.showToast(`Password reset for ${response.username}`);
                })
                .catch(error => {
                    // Show error
                    $('#resetPasswordError')
                        .text(error.message || 'Failed to reset password')
                        .removeClass('d-none');
                });
        },
        
        // Copy to clipboard utility
        copyToClipboard: function(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            Core.ui.showToast('Password copied to clipboard');
        }
    };

    // Register the Users module with Core
    if (window.Core && window.Core.module) {
        console.log('Registering Users module with Core (initial load)');
        Core.module.register('users', Users);
        // Auto-initialize the module
        setTimeout(() => {
            if (Core.auth.isAuthenticated()) {
                Users.init();
            }
        }, 500);
    } else {
        console.log('Core module not yet available, exposing Users globally');
        // Expose the module globally for later registration
        window.Users = Users;
        
        // Initialize when document is ready
        $(document).ready(() => {
            if (window.Core && window.Core.module) {
                console.log('Registering Users module with Core (delayed)');
                Core.module.register('users', Users);
                // Auto-initialize after delay
                setTimeout(() => {
                    if (Core.auth.isAuthenticated()) {
                        Users.init();
                    }
                }, 500);
            }
        });
    }

})(window, jQuery, window.Core); 