import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('[inline-build] dist directory does not exist.');
  process.exit(1);
}

const htmlPath = path.join(distDir, 'index.html');
if (!fs.existsSync(htmlPath)) {
  console.error('[inline-build] index.html does not exist in dist.');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const assetsDir = path.join(distDir, 'assets');
const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];

const cssFile = assetFiles.find(f => f.endsWith('.css'));
const jsFile = assetFiles.find(f => f.startsWith('index-') && f.endsWith('.js'));

if (!cssFile || !jsFile) {
  console.error('[inline-build] Could not locate primary CSS or JS bundles in dist/assets.');
  process.exit(1);
}

const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');

// Inject Streamlit component handshake into index.html as well
const streamlitHandshake = `
    <script>
      function sendStreamlitReady() {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ isStreamlitMessage: true, type: "streamlit:componentReady", apiVersion: 1 }, "*");
          window.parent.postMessage({ isStreamlitMessage: true, type: "streamlit:setFrameHeight", height: Math.max(document.documentElement.scrollHeight, 960) }, "*");
        }
      }
      window.addEventListener("load", sendStreamlitReady);
      window.addEventListener("DOMContentLoaded", sendStreamlitReady);
      setTimeout(sendStreamlitReady, 50);
      setTimeout(sendStreamlitReady, 250);
      setTimeout(sendStreamlitReady, 1000);
    </script>
`;

// Update dist/index.html with the handshake
let updatedIndexHtml = html;
if (!updatedIndexHtml.includes('streamlit:componentReady')) {
  updatedIndexHtml = updatedIndexHtml.replace('</body>', `${streamlitHandshake}\n  </body>`);
  fs.writeFileSync(htmlPath, updatedIndexHtml);
}

// Generate self-contained standalone.html for components.html()
let standalone = updatedIndexHtml
  .replace(/<link rel=\"stylesheet\"[^>]*href=\"[^\"]*\"[^>]*>/, `<style>${cssContent}</style>`)
  .replace(/<script type=\"module\"[^>]*src=\"[^\"]*\"[^>]*><\/script>/, `<script type=\"module\">${jsContent}</script>`);

fs.writeFileSync(path.join(distDir, 'standalone.html'), standalone);
console.log(`[inline-build] Standalone bundle created: dist/standalone.html (${(fs.statSync(path.join(distDir, 'standalone.html')).size / 1024).toFixed(1)} KB)`);
