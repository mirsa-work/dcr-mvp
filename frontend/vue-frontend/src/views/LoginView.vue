<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const username = ref('')
const password = ref('')
const loginError = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  // Skip if form is invalid or loading
  if (!username.value || !password.value || isLoading.value) {
    return
  }

  try {
    isLoading.value = true
    loginError.value = ''
    await authStore.login(username.value, password.value)
  } catch (error: any) {
    loginError.value = error.message || 'Login failed'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="position-fixed top-0 start-0 vw-100 vh-100 d-flex justify-content-center align-items-center bg-white bg-opacity-90">
    <div class="card p-3 p-md-4" style="max-width: 400px; width: 90%;">
      <div class="card-body">
        <div class="text-center mb-4">
          <span class="bi bi-stack fs-3 me-2"></span>
          <h4 class="d-inline-block">Southern Slice</h4>
        </div>
        <h5 class="mb-4 text-center">Login</h5>
        <form @submit.prevent="handleLogin">
          <div class="mb-3">
            <input 
              v-model="username" 
              class="form-control" 
              placeholder="Username" 
              required 
              autofocus
            >
          </div>
          <div class="mb-3">
            <input 
              v-model="password" 
              type="password" 
              class="form-control" 
              placeholder="Password" 
              required
            >
          </div>
          <button 
            type="submit" 
            class="btn btn-primary w-100" 
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Login
          </button>
          <div v-if="loginError" class="text-danger mt-2 text-center">{{ loginError }}</div>
        </form>
      </div>
    </div>
  </div>
</template> 