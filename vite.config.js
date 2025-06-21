import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig(({ mode }) => {
  if (mode === 'demo') {
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
            format: 'iife',
            name: 'VNEngineDemo'
          }
        },
        minify: false,
        sourcemap: true
      },
      server: {
        allowedHosts: [
          'localhost',
          '127.0.0.1',
          '.serveo.net',
          'vnengine.serveo.net'
        ]
      },
      publicDir: resolve(__dirname, 'demo/public')
    }
  }

  return {
    plugins: [
      dts({
        insertTypesEntry: true,
        exclude: ['**/*.test.ts', '**/*.spec.ts', 'demo*', 'test*']
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
        name: 'vn-engine',
        fileName: 'vn-engine',
        formats: ['es', 'umd', 'cjs']
      },
      rollupOptions: {
        external: ['js-yaml', 'lodash', 'handlebars'],
        output: {
          globals: {
            'js-yaml': 'yaml',
            'lodash': '_',
            'handlebars': 'Handlebars'
          }
        }
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    }
  }
})
