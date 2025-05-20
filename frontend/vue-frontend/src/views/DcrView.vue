<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import dcrService from '@/services/dcrService'
import type { Branch, DcrRecord } from '@/services/dcrService'
import { showToast } from '@/utils/toast'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.hasRole('ADMIN'))
const isBranchUser = computed(() => authStore.hasRole('BRANCH'))

// State variables
const branches = ref<Branch[]>([])
const selectedBranch = ref('')
const selectedMonth = ref('')
const dcrRecords = ref<DcrRecord[]>([])
const isLoading = ref(false)
const showAddNewButton = computed(() => isBranchUser.value)

// Set current month
const setCurrentMonth = () => {
  const today = new Date()
  selectedMonth.value = today.toISOString().slice(0, 7)
}

onMounted(async () => {
  setCurrentMonth()
  await loadBranches()
  
  // If we have branches, set the first one as selected and load DCRs
  if (branches.value.length > 0) {
    selectedBranch.value = branches.value[0].id
    await loadDcrRecords()
  }
})

// Load branches from API
const loadBranches = async () => {
  try {
    isLoading.value = true
    branches.value = await dcrService.getBranches()
  } catch (error: any) {
    showToast(error.message || 'Failed to load branches', 'danger')
    console.error('Failed to load branches:', error)
  } finally {
    isLoading.value = false
  }
}

// Load DCR records from API
const loadDcrRecords = async () => {
  if (!selectedBranch.value || !selectedMonth.value) {
    return
  }

  try {
    isLoading.value = true
    dcrRecords.value = await dcrService.getDcrRecords(selectedBranch.value, selectedMonth.value)
  } catch (error: any) {
    showToast(error.message || 'Failed to load DCR records', 'danger')
    console.error('Failed to load DCR records:', error)
  } finally {
    isLoading.value = false
  }
}

// Load DCR data when branch changes
const handleBranchChange = () => {
  loadDcrRecords()
}

// Load DCR data when month changes
const handleMonthChange = () => {
  loadDcrRecords()
}

// Refresh DCR data
const handleRefresh = () => {
  loadDcrRecords()
}

// Open DCR modal for new DCR
const handleNewDcr = () => {
  // TODO: Implement modal component for DCR
  alert('New DCR functionality will be implemented')
}

// Open DCR for viewing/editing
const handleDcrClick = (id: string) => {
  // TODO: Implement modal component for DCR
  alert(`View/edit DCR ${id} will be implemented`)
}

// Handle DCR action (submit, approve, reject, etc.)
const handleAction = async (action: string, id: string) => {
  try {
    isLoading.value = true
    let data = {}
    
    // If action is reject, get reason
    if (action === 'reject') {
      const reason = prompt('Enter reason for rejection:')
      // Cancel if no reason provided
      if (reason === null) {
        isLoading.value = false
        return
      }
      data = { reason }
    }
    
    await dcrService.updateDcrStatus(id, action, data)
    showToast(`DCR ${action} successful`)
    await loadDcrRecords()
  } catch (error: any) {
    showToast(error.message || `Failed to ${action} DCR`, 'danger')
    console.error(`DCR ${action} error:`, error)
  } finally {
    isLoading.value = false
  }
}

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}
</script>

<template>
  <div class="h-100 d-flex flex-column">
    <!-- Controls Row -->
    <div class="row g-2 g-md-3 mb-3">
      <div class="col-12 col-md-5 col-lg-4">
        <select v-model="selectedBranch" class="form-select" @change="handleBranchChange">
          <option v-for="branch in branches" :key="branch.id" :value="branch.id">
            {{ branch.name }}
          </option>
        </select>
      </div>
      <div class="col-8 col-md-3 col-lg-3">
        <input 
          v-model="selectedMonth" 
          type="month" 
          class="form-control"
          @change="handleMonthChange"
        >
      </div>
      <div class="col-4 col-md-2 col-lg-3 d-flex gap-2">
        <button @click="handleRefresh" class="btn btn-outline-secondary flex-grow-1 text-nowrap">
          <i class="bi bi-arrow-clockwise"></i>
          <span class="d-none d-md-inline"> Refresh</span>
        </button>
        <button 
          v-if="showAddNewButton" 
          @click="handleNewDcr" 
          class="btn btn-success flex-grow-1 text-nowrap"
        >
          <i class="bi bi-plus-circle"></i>
          <span class="d-none d-md-inline"> New</span>
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-responsive">
      <table class="table table-sm table-hover" id="dcrTable">
        <thead class="table-light">
          <tr>
            <th>Date</th>
            <th>DCR #</th>
            <th>Status</th>
            <th style="width:100px">Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading placeholder -->
          <tr v-if="isLoading">
            <td colspan="4" class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-secondary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <span class="ms-2">Loading records...</span>
            </td>
          </tr>
          <!-- Empty state -->
          <tr v-else-if="dcrRecords.length === 0">
            <td colspan="4" class="text-center py-3">
              <i class="bi bi-clipboard-x fs-4 text-muted d-block mb-2"></i>
              <span class="text-muted">No DCR records found for the selected period</span>
            </td>
          </tr>
          <!-- DCR records -->
          <tr 
            v-else 
            v-for="dcr in dcrRecords" 
            :key="dcr.id" 
            :data-id="dcr.id" 
            :data-status="dcr.status"
          >
            <td>{{ formatDate(dcr.dcr_date) }}</td>
            <td>
              <a href="#" class="dcr-number-link" @click.prevent="handleDcrClick(dcr.id)">
                {{ dcr.dcr_number }}
              </a>
            </td>
            <td>
              <span :class="['badge', `badge-${dcr.status}`]" class="d-none d-md-inline">
                {{ dcr.status }}
              </span>
              <span class="d-md-none status-icon" :data-status="dcr.status" :title="dcr.status"></span>
            </td>
            <td>
              <!-- Actions based on status and user role -->
              <template v-if="['DRAFT', 'REJECTED'].includes(dcr.status) && isBranchUser">
                <i class="bi bi-pencil action-btn" @click="handleAction('edit', dcr.id)" title="Edit"></i>
                <i class="bi bi-arrow-up-circle action-btn" @click="handleAction('submit', dcr.id)" title="Submit"></i>
              </template>
              <template v-else-if="dcr.status === 'SUBMITTED' && isAdmin">
                <i class="bi bi-check-circle action-btn" @click="handleAction('accept', dcr.id)" title="Accept"></i>
                <i class="bi bi-x-circle action-btn" @click="handleAction('reject', dcr.id)" title="Reject"></i>
              </template>
              <template v-else-if="dcr.status === 'ACCEPTED' && isAdmin">
                <i class="bi bi-arrow-counterclockwise action-btn" @click="handleAction('reopen', dcr.id)" title="Re-open"></i>
              </template>
              <template v-else>
                —
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template> 