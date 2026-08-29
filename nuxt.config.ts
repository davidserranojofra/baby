// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: {enabled: false},

    modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase'],

    css: ['~/assets/css/main.css'],

    supabase: {
        redirect: false,
    },

    app: {
        head: {
            title: 'Baby Tracker - Lactancia y Cuidados',
            meta: [
                {name: 'description', content: 'Mobile-first baby feeding and medication tracker'},
                {name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'},
                {name: 'theme-color', content: '#faf9f6'},
                {name: 'mobile-web-app-capable', content: 'yes'},
                {name: 'apple-mobile-web-app-capable', content: 'yes'},
                {name: 'apple-mobile-web-app-status-bar-style', content: 'default'},
                {name: 'apple-mobile-web-app-title', content: 'Baby Tracker'},
            ],
            link: [
                {rel: 'icon', type: 'image/png', href: '/favicon.png'},
                {rel: 'apple-touch-icon', href: '/apple-touch-icon.png'},
                {rel: 'manifest', href: '/manifest.json'},
                {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
                {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: ''},
                {
                    rel: 'stylesheet',
                    href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
                },
            ],
        },
    },
})
