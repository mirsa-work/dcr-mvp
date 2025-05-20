<script setup lang="ts">
import { ref, onMounted } from 'vue'
import dcrService from '@/services/dcrService'
import type { Branch, ReportData } from '@/services/dcrService'
import { showToast } from '@/utils/toast'

// State variables
const branches = ref<Branch[]>([])
const selectedBranch = ref('')
const selectedMonth = ref('')
const isLoading = ref(false)
const showReportPreview = ref(false)
const reportTitle = ref('')
const reportData = ref<ReportData | null>(null)

// Set current month
const setCurrentMonth = () => {
  const today = new Date()
  selectedMonth.value = today.toISOString().slice(0, 7)
}

onMounted(async () => {
  setCurrentMonth()
  await loadBranches()
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

// View report
const handleViewReport = async () => {
  if (!selectedBranch.value || !selectedMonth.value) {
    showToast('Please select branch and month', 'danger')
    return
  }
  
  try {
    isLoading.value = true
    showReportPreview.value = false
    
    // Get report data from API
    reportData.value = await dcrService.getReportData(selectedBranch.value, selectedMonth.value)
    
    // Set report title
    const branchName = branches.value.find(b => b.id === selectedBranch.value)?.name || 'Branch'
    reportTitle.value = `${branchName} - ${reportData.value.period}`
    
    // Show report preview
    showReportPreview.value = true
  } catch (error: any) {
    showToast(error.message || 'Failed to generate report', 'danger')
    console.error('Failed to generate report:', error)
  } finally {
    isLoading.value = false
  }
}

// Download PDF report
const handleDownloadPdf = () => {
  if (!selectedBranch.value || !selectedMonth.value) return
  
  const pdfUrl = dcrService.getReportPdfUrl(selectedBranch.value, selectedMonth.value)
  window.open(pdfUrl, '_blank')
}

// Render report table
const renderReportTable = () => {
  if (!reportData.value || !reportData.value.dailyData || reportData.value.dailyData.length === 0) {
    return '<div class="alert alert-info mt-3">No accepted DCRs found for this month. Please select a different month or ensure DCRs have been approved.</div>'
  }

  // This is a placeholder for actual report rendering
  // In real implementation, this would generate a proper HTML table from reportData
  return `
    <table class="table table-sm table-bordered table-hover">
      <thead class="table-light">
        <tr>
          <th>Date</th>
          <th>Day</th>
          <th>Consumption</th>
          <th>Total Revenue</th>
          <th>Cost %</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.value.dailyData.map((day, index) => `
          <tr class="${index % 2 === 0 ? '' : 'table-light'}">
            <td>${new Date(day.date).toLocaleDateString()}</td>
            <td>${day.day}</td>
            <td>${day.consumption || 0}</td>
            <td>${day.revenue || 0}</td>
            <td>${day.costPercentage?.toFixed(2) || '0.00'}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}
</script>

<template>
  <div class="h-100 d-flex flex-column">
    <!-- Controls Row -->
    <div class="row g-2 g-md-3 mb-3">
      <div class="col-12 col-md-5 col-lg-4">
        <select v-model="selectedBranch" class="form-select" required>
          <option value="">Select Branch</option>
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
          required
        >
      </div>
      <div class="col-4 col-md-2 col-lg-3">
        <button 
          type="button" 
          class="btn btn-primary w-100"
          @click="handleViewReport"
          :disabled="isLoading || !selectedBranch || !selectedMonth"
        >
          <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <i v-else class="bi bi-eye"></i>
          <span class="d-none d-md-inline"> View Report</span>
        </button>
      </div>
    </div>

    <!-- Report Preview -->
    <div v-if="showReportPreview" class="flex-grow-1 d-flex flex-column">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">{{ reportTitle }}</h5>
        <button 
          class="btn btn-success btn-sm"
          @click="handleDownloadPdf"
          :disabled="!reportData"
        >
          <i class="bi bi-file-pdf"></i> 
          <span class="d-none d-md-inline">Download PDF</span>
        </button>
      </div>
                  
      <!-- Dynamic Report Table Container -->
      <div class="table-responsive flex-grow-1">
        <!-- Placeholder for the report data -->
        <div v-if="!reportData" class="alert alert-info">
          Report data will be displayed here once loaded.
        </div>
        <!-- The table will be generated dynamically when reportData is available -->
        <div v-else v-html="renderReportTable()"></div>
      </div>
    </div>
  </div>
</template> 