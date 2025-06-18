// vite.config.js
import { defineConfig } from "file:///C:/Users/kenan/Documents/GitHub/vn-engine/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
import dts from "file:///C:/Users/kenan/Documents/GitHub/vn-engine/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "C:\\Users\\kenan\\Documents\\GitHub\\vn-engine";
var vite_config_default = defineConfig(({ mode }) => {
  if (mode === "demo") {
    return {
      root: "demo",
      resolve: {
        alias: {
          "@": resolve(__vite_injected_original_dirname, "src"),
          "vn-engine": resolve(__vite_injected_original_dirname, "src/index.ts")
        }
      }
    };
  }
  return {
    plugins: [
      dts({
        insertTypesEntry: true
      })
    ],
    resolve: {
      alias: {
        "@": resolve(__vite_injected_original_dirname, "src")
      }
    },
    build: {
      lib: {
        entry: resolve(__vite_injected_original_dirname, "src/index.ts"),
        name: "VNEngine",
        fileName: "vn-engine",
        formats: ["es", "umd"]
      },
      rollupOptions: {
        external: ["zustand", "handlebars", "js-yaml", "lodash"],
        output: {
          globals: {
            zustand: "zustand",
            handlebars: "Handlebars",
            "js-yaml": "yaml",
            lodash: "_"
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxrZW5hblxcXFxEb2N1bWVudHNcXFxcR2l0SHViXFxcXHZuLWVuZ2luZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxca2VuYW5cXFxcRG9jdW1lbnRzXFxcXEdpdEh1YlxcXFx2bi1lbmdpbmVcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2tlbmFuL0RvY3VtZW50cy9HaXRIdWIvdm4tZW5naW5lL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnXHJcbmltcG9ydCBkdHMgZnJvbSAndml0ZS1wbHVnaW4tZHRzJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIGlmIChtb2RlID09PSAnZGVtbycpIHtcclxuICAgIC8vIERlbW8gbW9kZSAtIGZvciB0ZXN0aW5nIHRoZSBsaWJyYXJ5XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByb290OiAnZGVtbycsXHJcbiAgICAgIHJlc29sdmU6IHtcclxuICAgICAgICBhbGlhczoge1xyXG4gICAgICAgICAgJ0AnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpLFxyXG4gICAgICAgICAgJ3ZuLWVuZ2luZSc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2luZGV4LnRzJylcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIExpYnJhcnkgYnVpbGQgbW9kZVxyXG4gIHJldHVybiB7XHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgIGR0cyh7XHJcbiAgICAgICAgaW5zZXJ0VHlwZXNFbnRyeTogdHJ1ZSxcclxuICAgICAgfSlcclxuICAgIF0sXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgJ0AnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICBsaWI6IHtcclxuICAgICAgICBlbnRyeTogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvaW5kZXgudHMnKSxcclxuICAgICAgICBuYW1lOiAnVk5FbmdpbmUnLFxyXG4gICAgICAgIGZpbGVOYW1lOiAndm4tZW5naW5lJyxcclxuICAgICAgICBmb3JtYXRzOiBbJ2VzJywgJ3VtZCddXHJcbiAgICAgIH0sXHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICBleHRlcm5hbDogWyd6dXN0YW5kJywgJ2hhbmRsZWJhcnMnLCAnanMteWFtbCcsICdsb2Rhc2gnXSxcclxuICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgIGdsb2JhbHM6IHtcclxuICAgICAgICAgICAgenVzdGFuZDogJ3p1c3RhbmQnLFxyXG4gICAgICAgICAgICBoYW5kbGViYXJzOiAnSGFuZGxlYmFycycsXHJcbiAgICAgICAgICAgICdqcy15YW1sJzogJ3lhbWwnLFxyXG4gICAgICAgICAgICBsb2Rhc2g6ICdfJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufSkiXSwKICAibWFwcGluZ3MiOiAiO0FBQXlULFNBQVMsb0JBQW9CO0FBQ3RWLFNBQVMsZUFBZTtBQUN4QixPQUFPLFNBQVM7QUFGaEIsSUFBTSxtQ0FBbUM7QUFJekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsTUFBSSxTQUFTLFFBQVE7QUFFbkIsV0FBTztBQUFBLE1BQ0wsTUFBTTtBQUFBLE1BQ04sU0FBUztBQUFBLFFBQ1AsT0FBTztBQUFBLFVBQ0wsS0FBSyxRQUFRLGtDQUFXLEtBQUs7QUFBQSxVQUM3QixhQUFhLFFBQVEsa0NBQVcsY0FBYztBQUFBLFFBQ2hEO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBR0EsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsSUFBSTtBQUFBLFFBQ0Ysa0JBQWtCO0FBQUEsTUFDcEIsQ0FBQztBQUFBLElBQ0g7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUssUUFBUSxrQ0FBVyxLQUFLO0FBQUEsTUFDL0I7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxLQUFLO0FBQUEsUUFDSCxPQUFPLFFBQVEsa0NBQVcsY0FBYztBQUFBLFFBQ3hDLE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLFNBQVMsQ0FBQyxNQUFNLEtBQUs7QUFBQSxNQUN2QjtBQUFBLE1BQ0EsZUFBZTtBQUFBLFFBQ2IsVUFBVSxDQUFDLFdBQVcsY0FBYyxXQUFXLFFBQVE7QUFBQSxRQUN2RCxRQUFRO0FBQUEsVUFDTixTQUFTO0FBQUEsWUFDUCxTQUFTO0FBQUEsWUFDVCxZQUFZO0FBQUEsWUFDWixXQUFXO0FBQUEsWUFDWCxRQUFRO0FBQUEsVUFDVjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
