// build.js
// Runs automatically on Vercel (and locally via `npm run build`) before deploy.
// It reads the Supabase connection details from environment variables and
// writes them into env-config.js, which index.html loads as a plain <script>.
//
// Why this approach: this project is a static site (no framework/bundler),
// so there is no native process.env support in the browser. This is the
// standard way to surface *public* config (URL + publishable/anon key) to
// static HTML while still keeping the values out of source control and
// configurable per-environment (Preview vs Production) in Vercel.
//
// IMPORTANT: only ever put the PUBLISHABLE/ANON key here. Never the
// Supabase service_role secret key — that must never reach the browser.

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    '[build.js] WARNING: SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is not set. ' +
    'The donation form will not be able to reach Supabase until these are set ' +
    'as Environment Variables in your Vercel project settings (or a local .env file).'
  );
}

const output = `// AUTO-GENERATED FILE — do not edit by hand.
// Produced by build.js from environment variables at build time.
window.__SUPABASE_ENV__ = {
  url: ${JSON.stringify(SUPABASE_URL)},
  publishableKey: ${JSON.stringify(SUPABASE_PUBLISHABLE_KEY)}
};
`;

fs.writeFileSync(path.join(__dirname, 'env-config.js'), output, 'utf8');
console.log('[build.js] env-config.js generated successfully.');
