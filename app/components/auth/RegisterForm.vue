<script setup lang="ts">
import { ref, computed } from 'vue';
import { Mail, Lock, Eye, EyeOff, Check, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';

const { signUpWithPassword, isLoading, authError, authSuccess } = useAuth();

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const localError = ref<string | null>(null);

// Password criteria checks (OWASP ASVS compliance)
const hasMinLength = computed(() => password.value.length >= 8);
const hasUppercase = computed(() => /[A-Z]/.test(password.value));
const hasLowercase = computed(() => /[a-z]/.test(password.value));
const hasNumberOrSymbol = computed(() => /[0-9\W]/.test(password.value));
const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return true;
  return password.value === confirmPassword.value;
});

// Calculate strength score 0 to 4
const strengthScore = computed(() => {
  let score = 0;
  if (hasMinLength.value) score++;
  if (hasUppercase.value) score++;
  if (hasLowercase.value) score++;
  if (hasNumberOrSymbol.value) score++;
  return score;
});

const isPasswordValid = computed(() => {
  return hasMinLength.value && hasUppercase.value && hasLowercase.value && hasNumberOrSymbol.value;
});

const isFormValid = computed(() => {
  return (
    email.value.trim().length > 0 &&
    isPasswordValid.value &&
    confirmPassword.value.length > 0 &&
    passwordsMatch.value
  );
});

const handleRegister = async () => {
  localError.value = null;

  if (!email.value.trim()) {
    localError.value = 'Por favor ingresá tu correo electrónico.';
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value.trim())) {
    localError.value = 'Ingresá un correo electrónico válido.';
    return;
  }

  if (!isPasswordValid.value) {
    localError.value = 'La contraseña no cumple con todos los requisitos de seguridad.';
    return;
  }

  if (password.value !== confirmPassword.value) {
    localError.value = 'Las contraseñas no coinciden.';
    return;
  }

  try {
    await signUpWithPassword(email.value, password.value);
  } catch (err: any) {
    // Handled in useAuth
  }
};
</script>

<template>
  <form @submit.prevent="handleRegister" class="space-y-4">
    <!-- Success Banner -->
    <div
      v-if="authSuccess"
      class="p-4 rounded-2xl bg-meds-soft border border-meds-border text-xs text-primaryText flex items-start gap-3 animate-in fade-in"
    >
      <CheckCircle2 class="w-5 h-5 text-meds flex-shrink-0 mt-0.5" />
      <div>
        <p class="font-bold text-meds">¡Registro exitoso!</p>
        <p class="text-secondaryText text-[11px] mt-0.5 leading-relaxed">{{ authSuccess }}</p>
      </div>
    </div>

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
          class="w-full pl-10 pr-4 py-3 rounded-2xl bg-subtle border border-borderSubtle text-primaryText placeholder-mutedText text-sm focus:outline-none focus:ring-2 focus:ring-breastLeft/30 focus:border-breastLeft transition-all"
        />
      </div>
    </div>

    <!-- Password Field -->
    <div class="space-y-1.5">
      <label class="block text-xs font-bold text-secondaryText">
        Contraseña
      </label>
      <div class="relative">
        <Lock class="w-4 h-4 text-mutedText absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          required
          autocomplete="new-password"
          placeholder="Mínimo 8 caracteres"
          class="w-full pl-10 pr-11 py-3 rounded-2xl bg-subtle border border-borderSubtle text-primaryText placeholder-mutedText text-sm focus:outline-none focus:ring-2 focus:ring-breastLeft/30 focus:border-breastLeft transition-all"
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

      <!-- Password Strength Indicator -->
      <div v-if="password.length > 0" class="pt-1 space-y-2">
        <div class="flex items-center gap-1.5 h-1.5 w-full bg-borderSubtle rounded-full overflow-hidden">
          <div
            class="h-full transition-all duration-300 rounded-full"
            :class="{
              'w-1/4 bg-rose-500': strengthScore <= 1,
              'w-2/4 bg-amber-500': strengthScore === 2,
              'w-3/4 bg-blue-500': strengthScore === 3,
              'w-full bg-emerald-500': strengthScore === 4
            }"
          />
        </div>

        <div class="grid grid-cols-2 gap-1.5 text-[11px] text-mutedText">
          <div class="flex items-center gap-1" :class="{ 'text-emerald-500 font-medium': hasMinLength }">
            <Check v-if="hasMinLength" class="w-3 h-3 text-emerald-500" />
            <X v-else class="w-3 h-3 text-mutedText" />
            <span>Mínimo 8 caracteres</span>
          </div>
          <div class="flex items-center gap-1" :class="{ 'text-emerald-500 font-medium': hasUppercase }">
            <Check v-if="hasUppercase" class="w-3 h-3 text-emerald-500" />
            <X v-else class="w-3 h-3 text-mutedText" />
            <span>Una mayúscula (A-Z)</span>
          </div>
          <div class="flex items-center gap-1" :class="{ 'text-emerald-500 font-medium': hasLowercase }">
            <Check v-if="hasLowercase" class="w-3 h-3 text-emerald-500" />
            <X v-else class="w-3 h-3 text-mutedText" />
            <span>Una minúscula (a-z)</span>
          </div>
          <div class="flex items-center gap-1" :class="{ 'text-emerald-500 font-medium': hasNumberOrSymbol }">
            <Check v-if="hasNumberOrSymbol" class="w-3 h-3 text-emerald-500" />
            <X v-else class="w-3 h-3 text-mutedText" />
            <span>Número o símbolo</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Password Field -->
    <div class="space-y-1.5">
      <label class="block text-xs font-bold text-secondaryText">
        Confirmar Contraseña
      </label>
      <div class="relative">
        <Lock class="w-4 h-4 text-mutedText absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          v-model="confirmPassword"
          :type="showConfirmPassword ? 'text' : 'password'"
          required
          autocomplete="new-password"
          placeholder="Repetí tu contraseña"
          class="w-full pl-10 pr-11 py-3 rounded-2xl bg-subtle border border-borderSubtle text-primaryText placeholder-mutedText text-sm focus:outline-none focus:ring-2 focus:ring-breastLeft/30 focus:border-breastLeft transition-all"
        />
        <button
          type="button"
          @click="showConfirmPassword = !showConfirmPassword"
          class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-mutedText hover:text-primaryText transition-colors"
          tabindex="-1"
        >
          <EyeOff v-if="showConfirmPassword" class="w-4 h-4" />
          <Eye v-else class="w-4 h-4" />
        </button>
      </div>
      <p
        v-if="confirmPassword.length > 0 && !passwordsMatch"
        class="text-[11px] text-rose-500 font-medium pt-0.5"
      >
        Las contraseñas no coinciden.
      </p>
    </div>

    <!-- Submit Button -->
    <button
      type="submit"
      :disabled="isLoading || !isFormValid"
      class="w-full py-3.5 rounded-2xl bg-breastLeft hover:opacity-90 text-white font-extrabold text-sm shadow-soft-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
    >
      <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
      <span v-else>Crear Cuenta</span>
    </button>
  </form>
</template>
