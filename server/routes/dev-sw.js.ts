export default defineEventHandler((event) => {
  // Silence residual dev service worker requests from previous projects on localhost:3000
  setResponseHeader(event, 'content-type', 'application/javascript');
  return '// No-op dev service worker';
});
