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

// Different setups name these differently:
//   - manually added in Vercel: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY
//   - Vercel's official "Supabase" integration: SUPABASE_URL / SUPABASE_ANON_KEY
//   - some integration versions / other frameworks: NEXT_PUBLIC_SUPABASE_URL /
//     NEXT_PUBLIC_SUPABASE_ANON_KEY
// We accept all of these so the build works regardless of how the project
// was connected, and log exactly which source was used for traceability.
function firstDefined(names) {
  for (const name of names) {
    if (process.env[name]) return { value: process.env[name], source: name };
  }
  return { value: '', source: null };
}

const urlResult = firstDefined([
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL'
]);
const keyResult = firstDefined([
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
]);

const SUPABASE_URL = urlResult.value;
const SUPABASE_PUBLISHABLE_KEY = keyResult.value;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    '[build.js] WARNING: could not find both a Supabase URL and key among the ' +
    'expected environment variable names (SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL, ' +
    'SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY / ' +
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). The donation form will not be able to ' +
    'reach Supabase until these are set as Environment Variables in Vercel.'
  );
} else {
  console.log(`[build.js] Using URL from ${urlResult.source}, key from ${keyResult.source}.`);
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
