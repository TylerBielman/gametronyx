// GitHub Pages serves 404.html for unknown paths; making it a copy of
// index.html lets BrowserRouter handle deep links like /join or /reset.
import { copyFileSync } from 'node:fs';

copyFileSync('dist/index.html', 'dist/404.html');
console.log('spa-fallback: dist/404.html written');
