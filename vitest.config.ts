import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Enable globals (describe, it, expect, etc.) for Jest-like experience
    globals: true,
    // Use the 'node' environment for our library
    environment: 'node',
  },
});
