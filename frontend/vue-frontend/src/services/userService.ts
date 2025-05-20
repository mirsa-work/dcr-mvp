import api from './api'

// Types
export interface User {
  id: string;
  username: string;
  role: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordResetRequest {
  userId: string;
}

export interface PasswordResetResponse {
  password: string;
}

// User Service
const userService = {
  // Get all users (admin only)
  async getUsers(): Promise<User[]> {
    return api.get('/api/users');
  },

  // Change current user's password
  async changePassword(passwordData: PasswordChangeRequest): Promise<void> {
    return api.post('/api/change-password', passwordData);
  },

  // Reset another user's password (admin only)
  async resetUserPassword(userData: PasswordResetRequest): Promise<PasswordResetResponse> {
    return api.post('/api/reset-user-password', userData);
  }
};

export default userService; 