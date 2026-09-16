import type { RemoteMountContext } from '@mfe/sdk';
import { createRoot, type Root } from 'react-dom/client';
import { AdminApp } from './AdminApp';

let root: Root | null = null;

export function mount(el: HTMLElement, ctx: RemoteMountContext): void {
  root = createRoot(el);
  root.render(<AdminApp {...ctx} />);
}

export function unmount(): void {
  root?.unmount();
  root = null;
}
