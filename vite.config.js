import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

// Cloudflare (npm run deploy) builds through its plugin; Vercel builds a plain static site into dist/.
export default defineConfig({
	plugins: process.env.VERCEL ? [] : [cloudflare()],
});
