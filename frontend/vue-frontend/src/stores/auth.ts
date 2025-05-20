import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import router from '@/router'

// Define types
interface User {
  username: string
  role: string
  [key: string]: any
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(null)
  const user = ref<User | null>(null)
  const error = ref<string | null>(null)

  // Config
  const storageKeys = {
    token: 'jwt',
    user: 'user'
  }

  // Getters (computed)
  const isAuthenticated = computed(() => !!token.value)
  const hasRole = (role: string) => user.value?.role === role

  // Actions
  function checkAuthentication() {
    const storedToken = localStorage.getItem(storageKeys.token)
    if (storedToken) {
      token.value = storedToken
      try {
        const userData = localStorage.getItem(storageKeys.user)
        if (userData) {
          user.value = JSON.parse(userData)
        }
      } catch (e) {
        console.error('Failed to parse user data', e)
        logout()
      }
    }
  }

  async function login(username: string, password: string) {
    try {
      error.value = null
      const response = await axios.post('/api/login', { username, password }, { 
        baseURL: import.meta.env.VITE_API_BASE_URL || '' 
      })
      token.value = response.data.token
      user.value = response.data.user
      
      // Store credentials
      if (response.data.token) {
        localStorage.setItem(storageKeys.token, response.data.token)
      }
      localStorage.setItem(storageKeys.user, JSON.stringify(response.data.user))
      
      // Redirect to dashboard
      router.push({ name: 'dashboard' })
      
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Login failed'
      throw new Error(error.value || 'Login failed')
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(storageKeys.token)
    localStorage.removeItem(storageKeys.user)
    
    // Redirect to login
    router.push({ name: 'login' })
  }

  return {
    // State
    token,
    user,
    error,
    
    // Getters
    isAuthenticated,
    hasRole,
    
    // Actions
    login,
    logout,
    checkAuthentication
  }
}) 