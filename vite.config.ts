import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// El API principal (api-pao.utpxpedition.com) responde con
// Access-Control-Allow-Origin: * , así que se puede llamar directo desde el navegador.
// El endpoint de token de Keycloak (sso.utp.edu.pe) solo permite el origen
// https://class.utp.edu.pe, por eso el refresh se hace a traves de este proxy.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/sso': {
        target: 'https://sso.utp.edu.pe',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/sso/, ''),
        headers: { Origin: 'https://class.utp.edu.pe' },
      },
      // Asistente virtual (unibot). Se proxea por si su CORS no permite localhost.
      '/unibot': {
        target: 'https://api-unibot.utpxpedition.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/unibot/, ''),
        headers: { Origin: 'https://class.utp.edu.pe' },
      },
    },
  },
});
