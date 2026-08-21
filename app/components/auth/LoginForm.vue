<script setup lang="ts">
import { ref } from 'vue';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';

const emit = defineEmits<{
  (e: 'forgot-password'): void;
}>();

const { loginWithPassword, isLoading, authError } = useAuth();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const localError = ref<string | null>(null);

const handleLogin = async () => {
  localError.value = null;

  if (!email.value.trim() || !password.value) {
    localError.value = 'Por favor completá tu correo y contraseña.';
    return;
  }

  try {
    await loginWithPassword(email.value, password.value);
  } catch (err: any) {
    // Handled in useAuth
  }
};
</script>

<template>
  <form @submit.prevent="handleLogin" class="space-y-4">
    <!-- Error Banner -->
    <div
      v-if="localError || authError"
      class="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-in fade-in"
    >
      <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{{ localError || authError }}</span>
    </div>

    <!-- Email Field -->
    <div class="space-y-1.5">
      <label class="block text-xs font-bold text-secondaryText">
        Correo Electrónico
      </label>
      <div class="relative">
        <Mail class="w-4 h-4 text-mutedText absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          placeholder="tu@email.com"
          class="w-full pl-10 pr-4 py-3 rounded-2xl bg-subtle border border-borderSubtle text-primaryText placeholder-mutedText text-sm focus:outline-none focus:ring-2 focus:ring-breastRight/30 focus:border-breastRight transition-all"
        />
      </div>
    </div>

    <!-- Password Field -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <label class="block text-xs font-bold text-secondaryText">
          Contraseña
        </label>
        <button
          type="button"
          @click="emit('forgot-password')"
          class="text-xs font-semibold text-breastRight hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>
      <div class="relative">
        <Lock class="w-4 h-4 text-mutedText absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          required
          autocomplete="current-password"
          placeholder="Tu contraseña"
          class="w-full pl-10 pr-11 py-3 rounded-2xl bg-subtle border border-borderSubtle text-primaryText placeholder-mutedText text-sm focus:outline-none focus:ring-2 focus:ring-breastRight/30 focus:border-breastRight transition-all"
        />
        <button
          type="button"
          @click="showPassword = !showPassword"
          class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-mutedText hover:text-primaryText transition-colors"
          tabindex="-1"
        >
          <EyeOff v-if="showPassword" class="w-4 h-4" />
          <Eye v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Submit Button -->
    <button
      type="submit"
      :disabled="isLoading || !email || !password"
      class="w-full py-3.5 rounded-2xl bg-breastRight hover:opacity-90 text-white font-extrabold text-sm shadow-soft-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
    >
      <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
      <span v-else>Iniciar Sesión</span>
    </button>
  </form>
</template>
