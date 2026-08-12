import path from 'node:path';
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';

const reactRoot = path.resolve(__dirname, 'node_modules/react');
const reactDomRoot = path.resolve(__dirname, 'node_modules/react-dom');

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      {
        find: 'vantage/style.css',
        replacement: path.resolve(__dirname, '../dist/vantage.css'),
      },
      {
        find: 'vantage',
        replacement: path.resolve(__dirname, '../src'),
      },
      // Lib sources under ../src would otherwise pull React from parent node_modules
      // → two copies in the Netlify bundle → useMemoCache on null.
      { find: 'react-dom', replacement: reactDomRoot },
      { find: 'react', replacement: reactRoot },
    ],
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
});
