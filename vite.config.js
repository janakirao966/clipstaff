import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import path from 'path';
export default defineConfig({
    plugins: [
        react(),
        !process.env.VITEST && crx({ manifest: manifest }),
    ].filter(Boolean),
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            onwarn: function (warning, warn) {
                if (warning.message && warning.message.includes('overwrites a previously emitted file')) {
                    return;
                }
                warn(warning);
            }
        }
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
    },
});
