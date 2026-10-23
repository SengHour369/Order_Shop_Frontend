import { defineConfig } from 'vitest/config';

// Keep the suite usable alongside the local Ollama and Docker services.
export default defineConfig({ test: { maxWorkers: 1, testTimeout: 15000, hookTimeout: 15000 } });
