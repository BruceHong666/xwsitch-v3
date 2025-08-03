import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    timeout: 10000,
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      include: [
        'entrypoints/**/*.ts',
        'utils/**/*.ts',
        'types/**/*.ts'
      ],
      exclude: [
        'node_modules',
        'tests',
        'dist',
        '**/*.d.ts',
        '**/*.config.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    reporters: ['verbose'],
    outputFile: {
      json: './test-results.json',
      junit: './test-results.xml'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/tests': path.resolve(__dirname, './tests'),
      '@/entrypoints': path.resolve(__dirname, './entrypoints'),
      '@/utils': path.resolve(__dirname, './utils'),
      '@/types': path.resolve(__dirname, './types')
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"'
  },
  esbuild: {
    target: 'es2020'
  }
});