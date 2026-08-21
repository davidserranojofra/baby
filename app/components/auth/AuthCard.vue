<script setup lang="ts">
import { ref } from 'vue';
import { Baby } from 'lucide-vue-next';
import GoogleAuthButton from '~/components/auth/GoogleAuthButton.vue';
import LoginForm from '~/components/auth/LoginForm.vue';
import RegisterForm from '~/components/auth/RegisterForm.vue';
import ForgotPasswordModal from '~/components/auth/ForgotPasswordModal.vue';
import { useAuth } from '~/composables/useAuth';

type AuthTab = 'login' | 'register';

const activeTab = ref<AuthTab>('login');
const isForgotOpen = ref<boolean>(false);

const { loginWithGoogle, isLoading } = useAuth();

const handleGoogleAuth = async () => {
  try {
    await loginWithGoogle();
  } catch (err) {
    // Handled in useAuth
  }
};
</script>

<template>
  <div class="w-full max-w-md bg-surface rounded-3xl border border-borderSubtle p-6 sm:p-8 shadow-soft-md space-y-6">
    <!-- Brand Header -->
    <div class="text-center space-y-2">
      <div class="w-12 h-12 mx-auto rounded-2xl bg-breastLeft-soft border border-breastLeft-border flex items-center justify-center text-breastLeft shadow-soft-sm">
        <Baby class="w-6 h-6" />
      </div>
      <h2 class="text-2xl font-black tracking-tight text-primaryText">
        {{ activeTab === 'login' ? 'Bienvenido/a' : 'Crear tu cuenta' }}
      </h2>
      <p class="text-xs text-mutedText max-w-xs mx-auto">
        {{ 
          activeTab === 'login' 
            ? 'Ingresá para gestionar las tomas, descansos y cuidados de tu bebé.' 
            : 'Comenzá a registrar de forma segura y personalizada la rutina de tu bebé.' 
        }}
      </p>
    </div>

    <!-- Segmented Tab Toggle -->
    <div class="p-1 rounded-2xl bg-subtle border border-borderSubtle flex gap-1">
      <button
        type="button"
        @click="activeTab = 'login'"
        class="flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200"
        :class="activeTab === 'login' ? 'bg-surface text-primaryText shadow-soft-sm' : 'text-mutedText hover:text-secondaryText'"
      >
        Iniciar Sesión
      </button>
      <button
        type="button"
        @click="activeTab = 'register'"
        class="flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200"
        :class="activeTab === 'register' ? 'bg-surface text-primaryText shadow-soft-sm' : 'text-mutedText hover:text-secondaryText'"
      >
        Registrarse
      </button>
    </div>

    <!-- Google OAuth Button -->
    <div>
      <GoogleAuthButton
        :is-loading="isLoading"
        @click="handleGoogleAuth"
      />
    </div>

    <!-- Divider -->
    <div class="relative flex items-center justify-center">
      <div class="w-full border-t border-borderSubtle" />
      <span class="absolute bg-surface px-3 text-[11px] font-medium text-mutedText uppercase tracking-wider">
        o con tu correo
      </span>
    </div>

    <!-- Tab Form Views -->
    <div>
      <LoginForm
        v-if="activeTab === 'login'"
        @forgot-password="isForgotOpen = true"
      />
      <RegisterForm
        v-else
      />
    </div>

    <!-- Forgot Password Modal -->
    <ForgotPasswordModal
      :is-open="isForgotOpen"
      @close="isForgotOpen = false"
    />
  </div>
</template>
