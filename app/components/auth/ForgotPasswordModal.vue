<script setup lang="ts">
import { ref } from 'vue';
import { Mail, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';

interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { sendPasswordReset, isLoading } = useAuth();
const email = ref('');
const localError = ref<string | null>(null);
const isSubmitted = ref(false);

const handleSubmit = async () => {
  if (!email.value.trim()) {
    localError.value = 'Por favor ingresá tu correo electrónico.';
    return;
  }

  // Basic email pattern validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value.trim())) {
    localError.value = 'Ingresá un correo electrónico válido.';
    return;
  }

  localError.value = null;
  try {
    await sendPasswordReset(email.value);
    isSubmitted.value = true;
  } catch (err: any) {
    localError.value = err.message || 'No se pudo enviar el correo de recuperación.';
  }
};

const handleClose = () => {
  email.value = '';
  localError.value = null;
  isSubmitted.value = false;
  emit('close');
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    @click.self="handleClose"
  >
    <div
      class="w-full max-w-sm bg-surface rounded-3xl border border-borderSubtle p-6 shadow-soft-lg space-y-5 animate-in zoom-in-95 duration-200"
    >
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-extrabold text-primaryText leading-snug">
            Recuperar Contraseña
          </h3>
          <p class="text-xs text-mutedText mt-0.5">
            Te enviaremos un enlace seguro a tu correo
          </p>
        </div>
        <button
          type="button"
          @click="handleClose"
          class="p-2 rounded-xl text-mutedText hover:text-primaryText hover:bg-subtle transition-all"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Success View -->
      <div v-if="isSubmitted" class="space-y-4 py-2 text-center">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-meds-soft border border-meds-border flex items-center justify-center text-meds">
          <CheckCircle2 class="w-6 h-6" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-bold text-primaryText">¡Correo enviado!</p>
          <p class="text-xs text-secondaryText leading-relaxed">
            Si la cuenta existe, recibirás las instrucciones para restablecer tu contraseña en <strong class="text-primaryText">{{ email }}</strong>.
          </p>
        </div>
        <button
          type="button"
          @click="handleClose"
          class="w-full py-3 rounded-2xl bg-breastRight text-white font-bold text-sm shadow-soft-sm hover:opacity-90 transition-all"
        >
          Entendido
        </button>
      </div>

      <!-- Form View -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Error Alert -->
        <div
          v-if="localError"
          class="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5"
        >
          <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{{ localError }}</span>
        </div>

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

        <div class="pt-2 flex gap-3">
          <button
            type="button"
            @click="handleClose"
            class="flex-1 py-3 rounded-2xl bg-subtle text-secondaryText font-bold text-sm hover:bg-borderSubtle transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="isLoading"
            class="flex-1 py-3 rounded-2xl bg-breastRight text-white font-bold text-sm shadow-soft-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
            <span v-else>Enviar Enlace</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
