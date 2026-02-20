<script setup lang="ts">
defineProps<{
  reverse?: boolean
}>()
</script>

<template>
  <div
    class="relative flex items-stretch h-dvh lg:max-w-none lg:px-0 overflow-hidden"
    :class="{ 'flex-row-reverse': reverse }"
  >
    <!-- Left Section: Login Form -->
    <div class="flex-1 flex flex-col justify-center px-6 lg:px-16 bg-background">
      <div class="mx-auto w-full max-w-[380px]">
        <slot />
      </div>
    </div>

    <!-- Right Section: Blue Gradient Branding Panel -->
    <div class="relative hidden h-full flex-1 flex-col p-12 lg:flex overflow-hidden login-brand-panel">
      <!-- Background gradient -->
      <div class="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700" />

      <!-- Subtle pattern overlay -->
      <div class="absolute inset-0 opacity-[0.07]" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 40px 40px;" />

      <!-- Animated glow orbs -->
      <div class="absolute -top-32 -right-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
      <div class="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-300/15 rounded-full blur-3xl animate-pulse" style="animation-delay: 1.5s;" />

      <!-- Content -->
      <div class="relative z-10 flex flex-col justify-center h-full">
        <!-- Logo + Title -->
        <div class="flex items-center gap-4 mb-12">
          <div class="h-16 w-16 rounded-full bg-black/80 flex items-center justify-center shadow-2xl overflow-hidden ring-2 ring-white/20">
            <img src="/devco-logo.png" alt="DEVCO" class="h-full w-full object-cover">
          </div>
          <div>
            <h2 class="text-2xl font-bold text-white tracking-wide">
              DEVCOERP
            </h2>
            <p class="text-blue-100/80 text-sm font-medium">
              Cloud Solutions
            </p>
          </div>
        </div>

        <!-- Separator line -->
        <div class="h-px bg-white/20 mb-12" />

        <!-- Main heading -->
        <h1 class="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
          Complete Business<br>Management Solution
        </h1>

        <!-- Description -->
        <p class="text-lg text-blue-100/80 leading-relaxed max-w-lg">
          Streamline your operations with our integrated ERP system. Manage CRM, jobs, documents, and reports all in one place.
        </p>

        <!-- Feature pills -->
        <div class="flex flex-wrap gap-3 mt-10">
          <span class="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium border border-white/10">
            📊 CRM
          </span>
          <span class="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium border border-white/10">
            📋 Job Management
          </span>
          <span class="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium border border-white/10">
            📄 Documents
          </span>
          <span class="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium border border-white/10">
            📈 Reports
          </span>
        </div>
      </div>

      <!-- Bottom version info -->
      <div class="relative z-10 mt-auto">
        <footer class="flex items-center gap-2 text-sm font-medium text-blue-200/50">
          <span class="h-px w-8 bg-blue-200/30" />
          DEVCOERP v2.0
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-brand-panel {
  animation: brandPanelFadeIn 0.8s ease-out forwards;
}

@keyframes brandPanelFadeIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
