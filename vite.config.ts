import {defineConfig} from 'vite';

export default defineConfig({
  server: {watch: {ignored: ['**/.tools/**', '**/artifacts/**', '**/reference/**']}},
});
