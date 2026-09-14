import { createTheme as createMuiTheme, type Theme } from '@mui/material/styles';
import { createThemeComponents } from './components.js';
import mixins from './mixins.js';
import { darkPalette, lightPalette } from './palette.js';
import shape from './shape.js';
import transitions from './transitions.js';
import typography from './typography.js';
import type { ThemeMode } from '../mode.js';

export function createTheme(mode: ThemeMode): Theme {
  const palette = mode === 'dark' ? darkPalette : lightPalette;

  const baseTheme = createMuiTheme({
    mixins,
    palette,
    shape,
    transitions,
    typography,
  });

  return createMuiTheme(
    {
      components: createThemeComponents(baseTheme),
    },
    baseTheme,
  );
}
