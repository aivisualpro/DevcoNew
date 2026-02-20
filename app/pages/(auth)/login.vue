<script setup lang="ts">
definePageMeta({
  layout: 'blank',
})
</script>

<template>
  <LayoutAuth>
    <div class="grid mx-auto max-w-sm gap-8">
      <!-- Logo + Welcome -->
      <div class="flex flex-col items-center gap-5 text-center">
        <div class="h-20 w-20 rounded-full overflow-hidden shadow-lg ring-2 ring-primary/10">
          <img src="/devco-logo.png" alt="DEVCO" class="h-full w-full object-cover">
        </div>
        <div class="grid gap-1.5">
          <h1 class="text-2xl font-bold tracking-tight text-foreground">
            Welcome Back
          </h1>
          <p class="text-sm text-muted-foreground leading-relaxed">
            Sign in to your DEVCO ERP account
          </p>
        </div>
      </div>
      <AuthSignIn />
    </div>
  </LayoutAuth>
</template>
