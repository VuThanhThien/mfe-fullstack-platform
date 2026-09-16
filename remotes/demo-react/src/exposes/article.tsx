import type { RemoteMountContext } from '@mfe/sdk';
import { createRoot, type Root } from 'react-dom/client';
import { ArticleApp } from '../ProductApp';

/** Separate module-level root — do not share with Product expose. */
let root: Root | null = null;

export function mount(el: HTMLElement, ctx: RemoteMountContext): void {
  root = createRoot(el);
  root.render(<ArticleApp {...ctx} />);
}

export function unmount(): void {
  root?.unmount();
  root = null;
}
