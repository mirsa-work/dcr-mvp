<script setup lang="ts">
import { ref } from 'vue'
import userService from '@/services/userService'
import { showToast } from '@/utils/toast'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Form data
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const isProcessing = ref(false)

// Password validation
const validatePasswordMatch = () => {
  if (newPassword.value && confirmPassword.value) {
    if (newPassword.value !== confirmPassword.value) {
      passwordError.value = 'Passwords do not match'
      return false
    }
  }
  passwordError.value = ''
  return true
}

// Handle form submission
const handleSubmit = async () => {
  // Skip if form is invalid or processing
  if (isProcessing.value) return

  // Validate form
  if (!currentPassword.value) {
    passwordError.value = 'Current password is required'
    return
  }
  
  if (!newPassword.value) {
    passwordError.value = 'New password is required'
    return
  }
  
  if (newPassword.value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters'
    return
  }
  
  if (!validatePasswordMatch()) {
    return
  }

  try {
    isProcessing.value = true
    passwordError.value = ''
    
    await userService.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    })
    
    showToast('Password changed successfully')
    resetForm()
    emit('close')
  } catch (error: any) {
    passwordError.value = error.message || 'Failed to change password'
  } finally {
    isProcessing.value = false
  }
}

// Reset the form
const resetForm = () => {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = ''
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
          <h5 class="modal-title">Change Password</h5>
          <button type="button" class="btn-close" @click="handleClose" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <div class="mb-3">
              <label for="currentPassword" class="form-label">Current Password</label>
              <input 
                type="password" 
                class="form-control" 
                id="currentPassword" 
                v-model="currentPassword" 
                required
              >
            </div>
            <div class="mb-3">
              <label for="newPassword" class="form-label">New Password</label>
              <input 
                type="password" 
                class="form-control" 
                id="newPassword" 
                v-model="newPassword" 
                required 
                minlength="6"
              >
              <div class="form-text">Password must be at least 6 characters long</div>
            </div>
            <div class="mb-3">
              <label for="confirmPassword" class="form-label">Confirm New Password</label>
              <input 
                type="password" 
                class="form-control" 
                id="confirmPassword" 
                v-model="confirmPassword" 
                required
                @input="validatePasswordMatch"
              >
            </div>
            <div v-if="passwordError" class="text-danger mb-3">{{ passwordError }}</div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="handleClose">Cancel</button>
          <button 
            type="button" 
            class="btn btn-primary" 
            @click="handleSubmit"
            :disabled="isProcessing"
          >
            <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Change Password
          </button>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" v-if="show"></div>
  </div>
</template> 