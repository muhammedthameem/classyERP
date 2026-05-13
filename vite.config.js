import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: 'autoUpdate',

      manifest: {
        name: 'Classy ERP',
        short_name: 'ClassyERP',
        description: 'Boutique ERP App',
        theme_color: '#000000',

        icons: [
          {
            src: '/logo-black.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo-black.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})