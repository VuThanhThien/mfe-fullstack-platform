import type { RemoteMountContext } from '@mfe/sdk';
import { createRoot, type Root } from 'react-dom/client';
import { ProductApp } from '../ProductApp';

/** Separate module-level root — do not share with Article expose. */
let root: Root | null = null;

export function mount(el: HTMLElement, ctx: RemoteMountContext): void {
  root = createRoot(el);
  root.render(<ProductApp {...ctx} />);
}

export function unmount(): void {
  root?.unmount();
  root = null;
}
