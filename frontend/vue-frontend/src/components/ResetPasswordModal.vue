<script setup lang="ts">
import { ref, onMounted } from 'vue'
import userService from '@/services/userService'
import type { User } from '@/services/userService'
import { showToast } from '@/utils/toast'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// State
const users = ref<User[]>([])
const selectedUserId = ref('')
const generatedPassword = ref('')
const resetError = ref('')
const isProcessing = ref(false)
const isPasswordGenerated = ref(false)

// Fetch users on mount
onMounted(async () => {
  await loadUsers()
})

// Load users from API
const loadUsers = async () => {
  try {
    isProcessing.value = true
    users.value = await userService.getUsers()
  } catch (error: any) {
    resetError.value = error.message || 'Failed to load users'
  } finally {
    isProcessing.value = false
  }
}

// Handle form submission
const handleSubmit = async () => {
  // Skip if form is invalid or processing
  if (isProcessing.value || !selectedUserId.value) return

  try {
    isProcessing.value = true
    resetError.value = ''
    
    const response = await userService.resetUserPassword({
      userId: selectedUserId.value
    })
    
    // Display generated password
    generatedPassword.value = response.password
    isPasswordGenerated.value = true
    
    showToast('Password reset successfully')
  } catch (error: any) {
    resetError.value = error.message || 'Failed to reset password'
  } finally {
    isProcessing.value = false
  }
}

// Copy password to clipboard
const copyPassword = () => {
  if (!generatedPassword.value) return
  
  navigator.clipboard.writeText(generatedPassword.value)
    .then(() => {
      showToast('Password copied to clipboard')
    })
    .catch(() => {
      showToast('Failed to copy password', 'danger')
    })
}

// Reset the form
const resetForm = () => {
  selectedUserId.value = ''
  generatedPassword.value = ''
  resetError.value = ''
  isPasswordGenerated.value = false
}

// When modal is closed
const handleClose = () => {
  resetForm()
  emit('close')
}
</script>

<template>
  <div 
    class="modal fade" 
    :class="{ 'show d-block': show }" 
    tabindex="-1" 
    :aria-hidden="!show"
  >
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Reset User Password</h5>
          <button type="button" class="btn-close" @click="handleClose" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <div class="mb-3">
              <label for="resetUserSelect" class="form-label">Select User</label>
              <select 
                class="form-select" 
                id="resetUserSelect" 
                v-model="selectedUserId" 
                required
                :disabled="isPasswordGenerated"
              >
                <option value="">Select a user</option>
                <option 
                  v-for="user in users" 
                  :key="user.id" 
                  :value="user.id"
                >
                  {{ user.username }}
                </option>
              </select>
            </div>
            <div v-if="isPasswordGenerated" class="mb-3">
              <label for="generatedPassword" class="form-label">Generated Password</label>
              <div class="input-group">
                <input 
                  type="text" 
                  class="form-control" 
                  id="generatedPassword" 
                  v-model="generatedPassword" 
                  readonly
                >
                <button class="btn btn-outline-secondary" type="button" @click="copyPassword">
                  <i class="bi bi-clipboard"></i>
                </button>
              </div>
              <div class="form-text text-warning">
                Please copy this password and provide it to the user. This is the only time it will be displayed.
              </div>
            </div>
            <div v-if="resetError" class="text-danger mb-3">{{ resetError }}</div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="handleClose">Close</button>
          <button 
            v-if="!isPasswordGenerated"
            type="button" 
            class="btn btn-primary" 
            @click="handleSubmit"
            :disabled="isProcessing || !selectedUserId"
          >
            <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Reset Password
          </button>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" v-if="show"></div>
  </div>
</template> 