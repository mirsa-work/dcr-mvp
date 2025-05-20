<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import ChangePasswordModal from '@/components/ChangePasswordModal.vue'
import ResetPasswordModal from '@/components/ResetPasswordModal.vue'

const router = useRouter()
const authStore = useAuthStore()

const isSidebarOpen = ref(false)
const showAdminFeatures = computed(() => authStore.hasRole('ADMIN'))
const username = computed(() => authStore.user?.username || '')

// Modal states
const showChangePasswordModal = ref(false)
const showResetPasswordModal = ref(false)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const logout = () => {
  authStore.logout()
}

const navigateTo = (route: string) => {
  router.push({ name: route })
  if (isSidebarOpen.value) {
    toggleSidebar()
  }
}

// Modal handlers
const openChangePasswordModal = () => {
  showChangePasswordModal.value = true
}

const closeChangePasswordModal = () => {
  showChangePasswordModal.value = false
}

const openResetPasswordModal = () => {
  showResetPasswordModal.value = true
}

const closeResetPasswordModal = () => {
  showResetPasswordModal.value = false
}
</script>

<template>
  <div id="appShell" class="d-flex flex-column flex-grow-1">
    <!-- Sidebar and Main Content Container -->
    <div class="row g-0 flex-grow-1">
      <!-- Sidebar Navigation - col on desktop, off-canvas on mobile -->
      <nav 
        id="sideBar" 
        class="col-md-2 bg-light border-end p-3" 
        :class="{ 'open': isSidebarOpen }"
      >
        <div class="text-center mb-4">
          <span class="bi bi-stack fs-3 me-2"></span>
          <h5 class="d-inline-block">Southern Slice</h5>
        </div>
        <ul class="nav flex-column">
          <!-- DCR Module -->
          <li class="nav-item">
            <div class="nav-link mb-2">
              <i class="bi bi-clipboard-data me-2"></i>
              <span class="fw-bold">DCR</span>
            </div>
            <ul class="nav flex-column ms-3">
              <li class="nav-item">
                <a 
                  class="nav-link" 
                  href="#"
                  :class="{ 'active': $route.name === 'dcr' }"
                  @click.prevent="navigateTo('dcr')"
                >
                  <i class="bi bi-file-earmark-text me-2"></i>Records
                </a>
              </li>
              <li class="nav-item" v-if="showAdminFeatures">
                <a 
                  class="nav-link" 
                  href="#"
                  :class="{ 'active': $route.name === 'reports' }" 
                  @click.prevent="navigateTo('reports')"
                >
                  <i class="bi bi-graph-up me-2"></i>Reports
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </nav>

      <!-- Main Content Area -->
      <div class="col-md-10 d-flex flex-column">
        <!-- Header -->
        <header class="sticky-top bg-white border-bottom p-2 p-md-3">
          <div class="row align-items-center g-0">
            <div class="col-auto me-2">
              <button 
                id="toggleSidebar" 
                class="btn btn-sm btn-outline-secondary d-lg-none py-1"
                @click="toggleSidebar"
              >
                <i class="bi bi-list"></i>
              </button>
            </div>
            <div class="col">
              <h5 class="m-0">
                <i class="bi bi-clipboard-data me-2"></i>
                <span id="headerTitle">
                  {{ $route.name === 'reports' ? 'DCR - Reports' : 'DCR - Records' }}
                </span>
              </h5>
            </div>
            <div class="col-auto">
              <div class="dropdown">
                <button 
                  id="userMenu"
                  class="btn btn-outline-secondary btn-sm dropdown-toggle text-nowrap py-1"
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                >
                  <i class="bi bi-person-circle me-1"></i>
                  <span class="text-truncate d-none d-md-inline" style="max-width: 120px;">
                    {{ username }}
                  </span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li>
                    <a class="dropdown-item" href="#" @click.prevent="openChangePasswordModal">
                      <i class="bi bi-key me-2"></i>Change Password
                    </a>
                  </li>
                  <li v-if="showAdminFeatures">
                    <a class="dropdown-item" href="#" @click.prevent="openResetPasswordModal">
                      <i class="bi bi-person-gear me-2"></i>Reset User Password
                    </a>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <li>
                    <a class="dropdown-item" href="#" @click.prevent="logout">
                      <i class="bi bi-box-arrow-right me-2"></i>Logout
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Content -->
        <main class="flex-grow-1 p-3 overflow-auto">
          <RouterView />
        </main>
      </div>
    </div>

    <!-- Modals -->
    <ChangePasswordModal 
      :show="showChangePasswordModal" 
      @close="closeChangePasswordModal"
    />
    
    <ResetPasswordModal 
      v-if="showAdminFeatures"
      :show="showResetPasswordModal" 
      @close="closeResetPasswordModal"
    />
    
    <!-- Toast container -->
    <div id="toastContainer" class="toast-container position-fixed bottom-0 end-0 p-3"></div>
  </div>
</template>

<style scoped>
/* Sidebar transition for mobile */
@media (max-width: 767.98px) {
  #sideBar {
    position: fixed;
    left: -100%;
    top: 0;
    width: 220px;
    height: 100vh;
    transition: left 0.2s;
    z-index: 1040;
  }

  #sideBar.open {
    left: 0;
  }
}
</style> 