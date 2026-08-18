<script setup lang="ts">
import { Baby, Moon, Pill, BarChart2 } from 'lucide-vue-next';

export type TabType = 'feeding' | 'sleep' | 'meds' | 'stats';

defineProps<{
  currentTab: TabType;
  hasOverdueMeds?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:tab', tab: TabType): void;
}>();
</script>

<template>
  <nav class="fixed bottom-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-borderSubtle safe-area-bottom">
    <div class="max-w-md mx-auto px-2 h-16 flex items-center justify-around">
      
      <!-- Tab 1: Lactancia / Feeding -->
      <button
        type="button"
        @click="emit('update:tab', 'feeding')"
        class="flex-1 py-1.5 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 relative"
        :class="currentTab === 'feeding' ? 'text-breastLeft font-bold' : 'text-mutedText hover:text-secondaryText font-medium'"
      >
        <div 
          class="p-1 rounded-xl transition-all"
          :class="currentTab === 'feeding' ? 'bg-breastLeft-soft' : ''"
        >
          <Baby class="w-5 h-5" />
        </div>
        <span class="text-[10px] sm:text-[11px] leading-none">Lactancia</span>
      </button>

      <!-- Tab 2: Sueño / Sleep -->
      <button
        type="button"
        @click="emit('update:tab', 'sleep')"
        class="flex-1 py-1.5 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 relative"
        :class="currentTab === 'sleep' ? 'text-bottle font-bold' : 'text-mutedText hover:text-secondaryText font-medium'"
      >
        <div 
          class="p-1 rounded-xl transition-all"
          :class="currentTab === 'sleep' ? 'bg-bottle-soft' : ''"
        >
          <Moon class="w-5 h-5" />
        </div>
        <span class="text-[10px] sm:text-[11px] leading-none">Sueño</span>
      </button>

      <!-- Tab 3: Medicamentos / Meds -->
      <button
        type="button"
        @click="emit('update:tab', 'meds')"
        class="flex-1 py-1.5 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 relative"
        :class="currentTab === 'meds' ? 'text-meds font-bold' : 'text-mutedText hover:text-secondaryText font-medium'"
      >
        <div 
          class="p-1 rounded-xl transition-all relative"
          :class="currentTab === 'meds' ? 'bg-meds-soft' : ''"
        >
          <Pill class="w-5 h-5" />
          <!-- Overdue dot indicator -->
          <span 
            v-if="hasOverdueMeds" 
            class="absolute top-0 right-0 w-2 h-2 rounded-full bg-warningSoft ring-2 ring-surface animate-pulse"
          />
        </div>
        <span class="text-[10px] sm:text-[11px] leading-none">Medicación</span>
      </button>

      <!-- Tab 4: Estadísticas / Stats -->
      <button
        type="button"
        @click="emit('update:tab', 'stats')"
        class="flex-1 py-1.5 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 relative"
        :class="currentTab === 'stats' ? 'text-primaryText font-bold' : 'text-mutedText hover:text-secondaryText font-medium'"
      >
        <div 
          class="p-1 rounded-xl transition-all"
          :class="currentTab === 'stats' ? 'bg-subtle' : ''"
        >
          <BarChart2 class="w-5 h-5" />
        </div>
        <span class="text-[10px] sm:text-[11px] leading-none">Estadísticas</span>
      </button>

    </div>
  </nav>
</template>
