import { createTheme } from '@mui/material/styles';

/**
 * Minimal MUI theme — intentionally boring.
 * Design is not the goal of the landing app.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
  },
});
