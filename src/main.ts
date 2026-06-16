import { createApp } from "vue";
import App from "./App.vue";
import { setDefaultEsmImporter } from "./registry";
import statusPill from "./widgets/status.module";

// Map the demo's local esm source specifiers to in-repo modules so the third-
// party widget loads with no network/CDN. A real host would leave the default
// importer (dynamic import of the manifest `source`) untouched.
const LOCAL_ESM_SOURCES: Record<string, () => Promise<unknown>> = {
  "demo:acme/status-pill": async () => ({ default: statusPill }),
};
setDefaultEsmImporter((source) => {
  const loader = LOCAL_ESM_SOURCES[source];
  return loader ? loader() : import(/* @vite-ignore */ source);
});

createApp(App).mount("#app");
