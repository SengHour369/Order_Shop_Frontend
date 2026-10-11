import { defineConfig } from 'vitest/config';

// Keep the suite usable alongside the local Ollama and Docker services.
export default defineConfig({ test: { maxWorkers: 2 } });
