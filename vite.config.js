import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig(({ mode }) => {
  if (mode === 'demo') {
    // Demo mode - for testing the library
    return {
      root: 'demo',
      resolve: {
        alias: {
          '@': resolve(__dirname, 'src'),
          'vn-engine': resolve(__dirname, 'src/index.ts')
        }
      },
      build: {
        outDir: '../dist-demo',
        rollupOptions: {
          input: {
            demo: resolve(__dirname, 'demo/demo.ts'),
            'demo-test': resolve(__dirname, 'demo/demo-test.ts')
          },
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: '[name]-[hash].js',
            assetFileNames: '[name]-[hash].[ext]',
            format: 'iife', // Immediately Invoked Function Expression - works in browsers
            name: 'VNEngineDemo' // Global variable name for the demo
          }
        },
        // Don't minify for easier debugging
        minify: false,
        sourcemap: true
      },
      server: {
        allowedHosts: [
          'localhost',
          '127.0.0.1',
          '.serveo.net',  // Allow all serveo.net subdomains
          'vnengine.serveo.net'  // Specific subdomain if needed
        ]
      },
      // Copy public assets (like your scripts/ folder)
      publicDir: resolve(__dirname, 'demo/public')
    }
  }

  // Library build mode
  return {
    plugins: [
      dts({
        insertTypesEntry: true,
        exclude: ['**/*.test.ts', '**/*.spec.ts', 'demo/**/*', 'test/**/*']
      })
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, '.')
      }
    },
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'VNEngine',
        fileName: 'vn-engine',
        formats: ['es', 'umd']
      },
      rollupOptions: {
        external: ['handlebars', 'js-yaml', 'lodash'],
        output: {
          globals: {
            handlebars: 'Handlebars',
            'js-yaml': 'yaml',
            lodash: '_',
          }
        }
      }
    }
  }
})