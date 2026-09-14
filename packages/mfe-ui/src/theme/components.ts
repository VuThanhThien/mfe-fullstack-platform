import type { Theme } from '@mui/material/styles';

/**
 * Lean component overrides adapted from the reference MUI theme.
 * Icon-based Checkbox defaults and date-picker internals omitted (YAGNI / React-free package).
 */
export function createThemeComponents(theme: Theme) {
  return {
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          '&.MuiAppBar-colorDefault': {
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: theme.spacing(3),
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
        },
      },
    },
    MuiList: {
      defaultProps: {
        disablePadding: true,
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          paddingTop: 12,
          paddingBottom: 12,
          '&.Mui-selected': {
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          paddingTop: 12,
          paddingBottom: 12,
          '&.Mui-selected': {
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 40,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTab: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 80,
        },
      },
    },
  };
}
