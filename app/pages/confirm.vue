<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { Loader2, CheckCircle2 } from 'lucide-vue-next';

const user = useSupabaseUser();
const router = useRouter();

// Watch user session hydration
watch(
  user,
  (newUser) => {
    if (newUser) {
      router.replace('/');
    }
  },
  { immediate: true }
);

onMounted(() => {
  // Fallback timeout in case user is already set or auth flow resolves
  const timer = setTimeout(() => {
    if (user.value) {
      router.replace('/');
    } else {
      router.replace('/login');
    }
  }, 2000);

  onUnmounted(() => clearTimeout(timer));
});
</script>

<template>
  <div class="min-h-screen bg-base text-primaryText flex items-center justify-center p-4">
    <div class="max-w-sm w-full bg-surface rounded-3xl border border-borderSubtle p-8 text-center shadow-soft-md space-y-4">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-breastLeft-soft border border-breastLeft-border flex items-center justify-center text-breastLeft animate-pulse">
        <Loader2 class="w-7 h-7 animate-spin" />
      </div>
      <div class="space-y-1">
        <h2 class="text-lg font-black text-primaryText">Verificando sesión</h2>
        <p class="text-xs text-mutedText">
          Estamos confirmando tu acceso de forma segura. Un momento por favor...
        </p>
      </div>
    </div>
  </div>
</template>
