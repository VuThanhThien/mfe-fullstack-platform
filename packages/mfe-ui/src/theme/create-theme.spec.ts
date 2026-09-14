import { describe, expect, it } from 'vitest';
import { createTheme } from './index.js';

describe('createTheme', () => {
  it('sets palette.mode light', () => {
    const theme = createTheme('light');
    expect(theme.palette.mode).toBe('light');
    expect(theme.palette.primary.main).toBeTruthy();
    expect(theme.palette.background.default).toBeTruthy();
  });

  it('sets palette.mode dark', () => {
    const theme = createTheme('dark');
    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.primary.main).toBeTruthy();
    expect(theme.palette.background.default).toBeTruthy();
  });
});
