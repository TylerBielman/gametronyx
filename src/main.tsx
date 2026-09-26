import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
// Fonts are bundled rather than fetched from Google, so the site makes no
// third-party requests. Cyrillic subsets carry the faux-Soviet lettering.
import '@fontsource/pt-sans-narrow/latin-400.css';
import '@fontsource/pt-sans-narrow/latin-700.css';
import '@fontsource/pt-sans-narrow/cyrillic-400.css';
import '@fontsource/pt-sans-narrow/cyrillic-700.css';
import '@fontsource/pt-mono/latin-400.css';
import '@fontsource/pt-mono/cyrillic-400.css';
import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/press-start-2p/cyrillic-400.css';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
