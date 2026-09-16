import { setMfRuntime } from '@mfe/sdk';
import {
  loadRemote as mfLoadRemote,
  registerRemotes as mfRegisterRemotes,
} from '@module-federation/enhanced/runtime';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Host owns the MF default instance (@module-federation/vite). Inject it into
// @mfe/sdk so registerRemotes/loadRemote do not bare-import a specifier the
// browser cannot resolve inside the shared SDK chunk.
setMfRuntime({
  registerRemotes: mfRegisterRemotes,
  loadRemote: mfLoadRemote,
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
