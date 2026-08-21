export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser();

  // Publicly accessible paths that do not require authentication
  const publicPaths = ['/login', '/confirm'];
  const isPublicRoute = publicPaths.includes(to.path);

  // If user is not authenticated and trying to access a private route
  if (!user.value && !isPublicRoute) {
    return navigateTo('/login');
  }

  // If user is already authenticated and trying to access the login page
  if (user.value && to.path === '/login') {
    return navigateTo('/');
  }
});
