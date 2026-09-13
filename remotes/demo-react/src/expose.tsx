import { createRoot, type Root } from 'react-dom/client';
import { DemoApp } from './DemoApp';

let root: Root | null = null;

export function mount(el: HTMLElement): void {
  root = createRoot(el);
  root.render(<DemoApp />);
}

export function unmount(): void {
  root?.unmount();
  root = null;
}
