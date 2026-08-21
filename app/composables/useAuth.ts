import { ref, computed } from 'vue';

export const useAuth = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const isLoading = ref<boolean>(false);
  const authError = ref<string | null>(null);
  const authSuccess = ref<string | null>(null);

  // Helper to map and sanitize auth errors (OWASP guidance: friendly, non-vague but leak-safe)
  const sanitizeErrorMessage = (error: any): string => {
    if (!error) return 'Ocurrió un error inesperado.';
    const msg = error.message || '';

    if (msg.includes('Invalid login credentials')) {
      return 'Credenciales incorrectas. Verificá tu correo y contraseña.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'Debés confirmar tu correo electrónico antes de iniciar sesión. Revisá tu bandeja de entrada.';
    }
    if (msg.includes('User already registered') || msg.includes('already exists')) {
      return 'Ya existe una cuenta registrada con este correo electrónico.';
    }
    if (msg.includes('Password should be at least')) {
      return 'La contraseña no cumple con los requisitos mínimos de seguridad.';
    }
    if (msg.includes('rate limit') || error.status === 429) {
      return 'Demasiados intentos fallidos. Por seguridad, por favor esperá unos minutos.';
    }
    if (msg.includes('NetworkError') || msg.includes('fetch')) {
      return 'Error de conexión con el servidor. Comprobá tu acceso a internet.';
    }

    return msg || 'No se pudo completar la operación. Por favor reintentá.';
  };

  // 1. Manual Login with Email & Password
  const loginWithPassword = async (emailInput: string, passwordInput: string) => {
    isLoading.value = true;
    authError.value = null;
    authSuccess.value = null;

    const email = emailInput.trim().toLowerCase();
    const password = passwordInput;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data?.session) {
        await navigateTo('/');
      }
      return data;
    } catch (err: any) {
      authError.value = sanitizeErrorMessage(err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 2. Manual Sign Up with Email & Password
  const signUpWithPassword = async (
    emailInput: string,
    passwordInput: string,
    fullName?: string
  ) => {
    isLoading.value = true;
    authError.value = null;
    authSuccess.value = null;

    const email = emailInput.trim().toLowerCase();
    const password = passwordInput;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/confirm`,
          data: {
            full_name: fullName?.trim() || undefined
          }
        }
      });

      if (error) throw error;

      // Check if email confirmation is required or if auto-signed in
      if (data?.user && !data?.session) {
        authSuccess.value = '¡Cuenta creada! Enviamos un correo de confirmación a tu email para activar tu cuenta.';
      } else if (data?.session) {
        authSuccess.value = '¡Cuenta creada con éxito!';
        await navigateTo('/');
      }

      return data;
    } catch (err: any) {
      authError.value = sanitizeErrorMessage(err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 3. Google OAuth Login
  const loginWithGoogle = async () => {
    isLoading.value = true;
    authError.value = null;
    authSuccess.value = null;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/confirm`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      authError.value = sanitizeErrorMessage(err);
      isLoading.value = false;
      throw err;
    }
  };

  // 4. Send Password Reset Email
  const sendPasswordReset = async (emailInput: string) => {
    isLoading.value = true;
    authError.value = null;
    authSuccess.value = null;

    const email = emailInput.trim().toLowerCase();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/confirm?type=recovery`
      });

      if (error) throw error;
      authSuccess.value = 'Te enviamos un enlace de recuperación. Revisá tu casilla de correo.';
      return data;
    } catch (err: any) {
      authError.value = sanitizeErrorMessage(err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 5. Logout and Clear App State
  const logout = async () => {
    isLoading.value = true;
    try {
      // Clear domain composables state
      const { resetState: resetFeedings } = useFeedingTracker();
      const { resetState: resetSleep } = useSleepTracker();
      const { resetState: resetMeds } = useMedicationTracker();

      resetFeedings();
      resetSleep();
      resetMeds();

      await supabase.auth.signOut();
      await navigateTo('/login');
    } catch (err: any) {
      console.error('Error during logout:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const userDisplayName = computed(() => {
    if (!user.value) return '';
    return (
      user.value.user_metadata?.full_name ||
      user.value.user_metadata?.name ||
      user.value.email?.split('@')[0] ||
      'Usuario'
    );
  });

  const userEmail = computed(() => user.value?.email || '');

  return {
    user,
    userDisplayName,
    userEmail,
    isLoading,
    authError,
    authSuccess,
    loginWithPassword,
    signUpWithPassword,
    loginWithGoogle,
    sendPasswordReset,
    logout
  };
};
