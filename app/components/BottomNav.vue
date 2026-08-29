<script setup lang="ts">
import { Baby, Moon, Scale, Pill, BarChart2 } from 'lucide-vue-next';

export type TabType = 'feeding' | 'sleep' | 'weight' | 'meds' | 'stats';

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
    <div class="max-w-md mx-auto px-3 sm:px-4 h-16 grid grid-cols-5 items-center">
      
      <!-- Tab 1: Lactancia / Feeding -->
      <button
        type="button"
        @click="emit('update:tab', 'feeding')"
        class="flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-all active:scale-95 relative group"
        :class="currentTab === 'feeding' ? 'text-breastLeft font-semibold' : 'text-mutedText hover:text-secondaryText font-medium'"
      >
        <div 
          class="p-1 rounded-xl transition-all flex items-center justify-center"
          :class="currentTab === 'feeding' ? 'bg-breastLeft-soft' : ''"
        >
          <Baby class="w-5 h-5 flex-shrink-0" />
        </div>
        <span class="text-[10px] sm:text-[11px] leading-tight tracking-tight truncate max-w-full text-center mt-0.5">Lactancia</span>
      </button>

      <!-- Tab 2: Sueño / Sleep -->
      <button
        type="button"
        @click="emit('update:tab', 'sleep')"
        class="flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-all active:scale-95 relative group"
        :class="currentTab === 'sleep' ? 'text-bottle font-semibold' : 'text-mutedText hover:text-secondaryText font-medium'"
      >
        <div 
          class="p-1 rounded-xl transition-all flex items-center justify-center"
          :class="currentTab === 'sleep' ? 'bg-bottle-soft' : ''"
        >
          <Moon class="w-5 h-5 flex-shrink-0" />
        </div>
        <span class="text-[10px] sm:text-[11px] leading-tight tracking-tight truncate max-w-full text-center mt-0.5">Sueño</span>
      </button>

      <!-- Tab 3: Crecimiento / Growth (Peso & Altura) -->
      <button
        type="button"
        @click="emit('update:tab', 'weight')"
        class="flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-all active:scale-95 relative group"
        :class="currentTab === 'weight' ? 'text-weight font-semibold' : 'text-mutedText hover:text-secondaryText font-medium'"
      >
        <div 
          class="p-1 rounded-xl transition-all flex items-center justify-center"
          :class="currentTab === 'weight' ? 'bg-weight-soft' : ''"
        >
          <Scale class="w-5 h-5 flex-shrink-0" />
        </div>
        <span class="text-[10px] sm:text-[11px] leading-tight tracking-tight truncate max-w-full text-center mt-0.5">Crecimiento</span>
      </button>

      <!-- Tab 4: Medicamentos / Meds -->
      <button
        type="button"
        @click="emit('update:tab', 'meds')"
        class="flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-all active:scale-95 relative group"
        :class="currentTab === 'meds' ? 'text-meds font-semibold' : 'text-mutedText hover:text-secondaryText font-medium'"
      >
        <div 
          class="p-1 rounded-xl transition-all relative flex items-center justify-center"
          :class="currentTab === 'meds' ? 'bg-meds-soft' : ''"
        >
          <Pill class="w-5 h-5 flex-shrink-0" />
          <!-- Overdue dot indicator -->
          <span 
            v-if="hasOverdueMeds" 
            class="absolute top-0 right-0 w-2 h-2 rounded-full bg-warningSoft ring-2 ring-surface animate-pulse"
          />
        </div>
        <span class="text-[10px] sm:text-[11px] leading-tight tracking-tight truncate max-w-full text-center mt-0.5">Medicación</span>
      </button>

      <!-- Tab 5: Estadísticas / Stats -->
      <button
        type="button"
        @click="emit('update:tab', 'stats')"
        class="flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-all active:scale-95 relative group"
        :class="currentTab === 'stats' ? 'text-primaryText font-semibold' : 'text-mutedText hover:text-secondaryText font-medium'"
      >
        <div 
          class="p-1 rounded-xl transition-all flex items-center justify-center"
          :class="currentTab === 'stats' ? 'bg-subtle' : ''"
        >
          <BarChart2 class="w-5 h-5 flex-shrink-0" />
        </div>
        <span class="text-[10px] sm:text-[11px] leading-tight tracking-tight truncate max-w-full text-center mt-0.5">Estadísticas</span>
      </button>

    </div>
  </nav>
</template>

