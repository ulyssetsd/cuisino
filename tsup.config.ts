import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'es2022',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
  shims: true,
  dts: true,
});
