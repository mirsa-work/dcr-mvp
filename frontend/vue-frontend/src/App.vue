<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { onMounted, computed } from 'vue'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

onMounted(() => {
  // Check for existing authentication on app load
  authStore.checkAuthentication()
})
</script>

<template>
  <div class="app-container d-flex flex-column vh-100">
    <!-- The app shows either the authenticated view or login view -->
    <RouterView />
  </div>
</template>

<style>
/* Global styles */
html, body {
  height: 100%;
}

/* Status badges */
.badge-DRAFT {
  background: #6c757d;
}

.badge-REJECTED {
  background: #dc3545;
}

.badge-SUBMITTED {
  background: #0d6efd;
}

.badge-ACCEPTED {
  background: #198754;
}

/* Status icons (for mobile) */
.status-icon {
  display: none;
  /* Hidden by default (shown on mobile) */
  width: 20px;
  height: 20px;
  border-radius: 50%;
  position: relative;
}

.status-icon::after {
  font-family: "bootstrap-icons";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: white;
}

/* Mobile-only display */
@media (max-width: 767.98px) {
  .status-icon {
    display: inline-block;
  }

  /* Icon definitions */
  .status-icon[data-status="DRAFT"] {
    background-color: #6c757d;
  }

  .status-icon[data-status="DRAFT"]::after {
    content: "\F287";
    /* bi-pencil */
  }

  .status-icon[data-status="SUBMITTED"] {
    background-color: #0d6efd;
  }

  .status-icon[data-status="SUBMITTED"]::after {
    content: "\F138";
    /* bi-send */
  }

  .status-icon[data-status="ACCEPTED"] {
    background-color: #198754;
  }

  .status-icon[data-status="ACCEPTED"]::after {
    content: "\F26C";
    /* bi-check-circle */
  }

  .status-icon[data-status="REJECTED"] {
    background-color: #dc3545;
  }

  .status-icon[data-status="REJECTED"]::after {
    content: "\F62A";
    /* bi-x-circle */
  }
}

.action-btn {
  margin-right: 0.4rem;
  font-size: 1rem;
  cursor: pointer;
}

.action-btn:last-child {
  margin-right: 0;
}

/* Other global styles from the original app */
.readonly-input {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.dcr-number-link {
  color: inherit;
  text-decoration: none;
}

.dcr-number-link:hover {
  text-decoration: underline;
}
</style>
