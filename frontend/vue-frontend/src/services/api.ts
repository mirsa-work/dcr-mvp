import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth'

// API base URL - default to API container in Docker for production
const API_BASE_URL = import.meta.env.MODE === 'production' 
  ? 'http://api:3000' 
  : (import.meta.env.VITE_API_BASE_URL || '')

// Create API instance
const apiInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to include auth token
apiInstance.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers['Authorization'] = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle errors
apiInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized, redirect to login
      const authStore = useAuthStore()
      authStore.logout()
    }
    
    // Format error message
    let errorMessage = 'Request failed'
    const responseData = error.response?.data as any
    
    if (responseData?.error) {
      errorMessage = responseData.error
    } else if (responseData?.errors && Array.isArray(responseData.errors)) {
      errorMessage = responseData.errors.join(', ')
    } else if (error.message) {
      errorMessage = error.message
    }
    
    // Create standardized error
    const formattedError = new Error(errorMessage)
    return Promise.reject(formattedError)
  }
)

// API Service
export default {
  // GET request
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiInstance.get<T>(url, config)
    return response.data
  },
  
  // POST request
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiInstance.post<T>(url, data, config)
    return response.data
  },
  
  // PUT request
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiInstance.put<T>(url, data, config)
    return response.data
  },
  
  // DELETE request
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiInstance.delete<T>(url, config)
    return response.data
  }
} 