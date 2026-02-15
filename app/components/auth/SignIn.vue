<script setup lang="ts">
import { Loader2, Mail, Lock } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import PasswordInput from '~/components/PasswordInput.vue'

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

async function onSubmit(event: Event) {
  event.preventDefault()
  errorMessage.value = ''

  if (!email.value || !password.value) {
    errorMessage.value = 'Please fill in all fields'
    return
  }

  isLoading.value = true

  try {
    const response = await $fetch<any>('/api/auth/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
      },
    })

    // 30-day persistent session
    const maxAge = 30 * 24 * 60 * 60
    const cookieOpts = { maxAge, path: '/', sameSite: 'lax' as const }

    const isLoggedIn = useCookie('isLoggedIn', cookieOpts)
    isLoggedIn.value = 'true'

    if (response?.token) {
      const authToken = useCookie('authToken', cookieOpts)
      authToken.value = response.token
    }

    if (response?.user) {
      const userData = useCookie('userData', cookieOpts)
      userData.value = JSON.stringify(response.user)
    }

    toast.success('Login successful! Redirecting...')
    navigateTo('/')
  }
  catch (err: any) {
    const message = err?.data?.statusMessage || err?.data?.message || err?.statusMessage || 'Login failed. Please check your credentials.'
    errorMessage.value = message
    toast.error(message)
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <form class="grid gap-5" @submit="onSubmit">
    <div class="grid gap-2">
      <Label for="email" class="text-sm font-medium text-foreground/80">
        Email Address
      </Label>
      <div class="relative">
        <Mail class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          id="email"
          v-model="email"
          type="email"
          placeholder="name@devco.com"
          class="pl-10 h-11"
          :disabled="isLoading"
        />
      </div>
    </div>
    <div class="grid gap-2">
      <div class="flex items-center">
        <Label for="password" class="text-sm font-medium text-foreground/80">
          Password
        </Label>
        <NuxtLink
          to="/forgot-password"
          class="ml-auto inline-block text-xs text-primary/70 hover:text-primary transition-colors"
        >
          Forgot password?
        </NuxtLink>
      </div>
      <div class="relative">
        <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10" />
        <PasswordInput id="password" v-model="password" class="pl-10 h-11" />
      </div>
    </div>
    <div v-if="errorMessage" class="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
      {{ errorMessage }}
    </div>
    <Button type="submit" class="w-full h-11 text-sm font-semibold" :disabled="isLoading">
      <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
      {{ isLoading ? 'Signing in...' : 'Sign In' }}
    </Button>
  </form>
</template>
