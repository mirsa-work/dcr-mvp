<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="container h-100 d-flex align-items-center justify-content-center py-5">
    <div class="text-center">
      <h1 class="display-1 fw-bold">404</h1>
      <p class="fs-3">
        <span class="text-danger">Oops!</span> Page not found.
      </p>
      <p class="lead">
        The page you're looking for doesn't exist.
      </p>
      <button @click="goHome" class="btn btn-primary">Go Home</button>
    </div>
  </div>
</template> 