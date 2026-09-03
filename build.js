/* build.js — src/ into one self-contained index.html.
 *
 * Handover section 10 promised "no build step" and section 17.1 asked for a
 * repository with the test suites wired in. Those are not in conflict: the
 * DELIVERED artifact is still one HTML file with no runtime dependency and no
 * backend, which is section 16.6's constraint. The build exists so that nobody
 * edits 149 KB by find-and-replace again, which is section 17.1's.
 *
 *   node build.js          write index.html and manifest.webmanifest
 *   node build.js --check   build, then fail if index.html would change
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const check = process.argv.includes('--check');

const cssFiles = ['src/style/app.css', 'src/style/components.css'];
const css = cssFiles.map(f => {
  const text = readFileSync(f, 'utf8');
  /* A stray </style> inside an inlined stylesheet closes the tag early and
     silently turns every rule after it into page text. That happened once:
     app.css was extracted from the old single file by line range and carried
     the closing tag with it, so the whole of components.css was inert while
     still being present in the output and in every grep. */
  if (/<\/?style/i.test(text)) throw new Error(`${f} contains a <style> tag — it would close the inlined block early`);
  return text;
}).join('\n');

const out = await build({
  entryPoints: ['src/main.ts'],
  bundle: true, format: 'iife', target: ['safari15', 'chrome100'],
  minify: true, legalComments: 'none', write: false,
});
const js = out.outputFiles[0].text;

const html = readFileSync('src/index.template.html', 'utf8')
  .replace('/*CSS*/', () => css)
  .replace('/*JS*/', () => js);

const manifest = {
  name: 'Mrinal and Ramesh — Consistency is key',
  short_name: 'The Plan',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#FBFAF7',
  theme_color: '#0F5449',
  icons: [{ src: './icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' }],
};

if (check) {
  const was = existsSync('index.html') ? readFileSync('index.html', 'utf8') : '';
  if (was !== html) {
    console.error('index.html is out of date — run `npm run build` and commit the result.');
    process.exit(1);
  }
  console.log('index.html is current');
  process.exit(0);
}

writeFileSync('index.html', html);
writeFileSync('manifest.webmanifest', JSON.stringify(manifest, null, 2) + '\n');
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
console.log(`index.html  ${kb(html.length)}  (css ${kb(css.length)}, js ${kb(js.length)})`);
