<script setup lang="ts">
import { onMounted } from 'vue';
import { Sun, Moon, ShieldCheck } from 'lucide-vue-next';
import AuthCard from '~/components/auth/AuthCard.vue';
import { useTheme } from '~/composables/useTheme';

const { isDark, toggleTheme, initTheme } = useTheme();

onMounted(() => {
  initTheme();
});
</script>

<template>
  <div class="min-h-screen bg-base text-primaryText flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200">
    <!-- Top Right Controls (Theme Toggle) -->
    <header class="w-full max-w-md mx-auto flex justify-end">
      <button
        type="button"
        @click="toggleTheme"
        class="p-2.5 rounded-2xl bg-surface hover:bg-subtle text-secondaryText hover:text-primaryText transition-all border border-borderSubtle shadow-soft-sm active:scale-95"
        :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      >
        <Sun v-if="isDark" class="w-4 h-4 text-warningSoft" />
        <Moon v-else class="w-4 h-4 text-primaryText" />
      </button>
    </header>

    <!-- Main Auth Card Container -->
    <main class="w-full max-w-md mx-auto my-auto py-6 flex items-center justify-center">
      <AuthCard />
    </main>

    <!-- Footer Privacy & Security Assurance -->
    <footer class="w-full max-w-md mx-auto text-center pt-4 pb-2">
      <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-borderSubtle text-[11px] text-mutedText shadow-soft-sm">
        <ShieldCheck class="w-3.5 h-3.5 text-meds" />
        <span>Tus datos y tiempos están protegidos y cifrados de forma privada.</span>
      </div>
    </footer>
  </div>
</template>
