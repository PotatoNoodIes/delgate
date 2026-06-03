export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: '2026-06-02',
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/layout.css', '~/assets/css/chat.css'],
  runtimeConfig: {
    groqApiKey: process.env.GROQ_API_KEY || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '587',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || 'noreply@delgate.ca',
    public: {
      cadToUsdRate: process.env.CAD_TO_USD_RATE || '0.74',
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    },
  },
  app: {
    baseURL: '/delgate/',
    head: {
      title: 'DelGate Freight Assistant',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'AI-powered freight quote assistant for DelGate Logistics. Get accurate Canadian freight quotes through natural conversation.',
        },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        },
      ],
    },
  },
  typescript: {
    strict: true,
    shim: false,
  },
})
