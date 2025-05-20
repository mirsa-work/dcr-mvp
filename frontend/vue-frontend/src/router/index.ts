import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Define routes
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'root',
      redirect: { name: 'dashboard' }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dcr',
          component: () => import('../views/DcrView.vue')
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('../views/ReportsView.vue')
        }
      ]
    },
    // Catch all route - 404 page
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue')
    }
  ]
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth !== false // Default to requiring auth
  
  if (requiresAuth && !authStore.isAuthenticated) {
    // If route requires auth and user is not authenticated, redirect to login
    next({ name: 'login' })
  } else if (to.name === 'login' && authStore.isAuthenticated) {
    // If user is already authenticated and tries to access login page, redirect to dashboard
    next({ name: 'dashboard' })
  } else {
    // Continue navigation
    next()
  }
})

export default router
