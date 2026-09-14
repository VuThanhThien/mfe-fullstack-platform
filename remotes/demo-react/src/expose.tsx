import { createRoot, type Root } from 'react-dom/client';
import type { RemoteMountContext } from '@mfe/sdk';
import { DemoApp } from './DemoApp';

let root: Root | null = null;

export function mount(el: HTMLElement, ctx: RemoteMountContext): void {
  root = createRoot(el);
  root.render(<DemoApp {...ctx} />);
}

export function unmount(): void {
  root?.unmount();
  root = null;
}
