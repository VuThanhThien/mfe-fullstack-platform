import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminApp } from './AdminApp';

// Standalone entry — only used for isolated `vite dev` preview.
// In the happy path the shell loads this via Module Federation (remoteEntry.js).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp basePath="/app/admin" routeName="admin" />
  </StrictMode>,
);
