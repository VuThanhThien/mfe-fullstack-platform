import type { PaletteOptions } from '@mui/material/styles';

const grey = {
  '50': '#ECEFF1',
  '100': '#CFD8DC',
  '200': '#B0BEC5',
  '300': '#90A4AE',
  '400': '#78909C',
  '500': '#607D8B',
  '600': '#546E7A',
  '700': '#455A64',
  '800': '#37474F',
  '900': '#263238',
};

export const darkPalette: PaletteOptions = {
  ...{ grey },
  contrastThreshold: 4.5,
  mode: 'dark',
  error: { main: '#FF8A65' },
  info: { main: '#4FC3F7' },
  primary: { main: '#64B5F6', contrastText: grey['900'] },
  secondary: { main: grey['900'] },
  success: { main: '#81C784' },
  warning: { main: '#FFD54F' },
  text: {
    primary: grey['100'],
    secondary: grey['300'],
    disabled: grey['600'],
  },
  divider: grey['700'],
  background: {
    paper: grey['900'],
    default: grey['800'],
  },
  action: {
    selectedOpacity: 0,
    selected: grey['800'],
  },
};

export const lightPalette: PaletteOptions = {
  ...{ grey },
  contrastThreshold: 3,
  mode: 'light',
  error: { main: '#FF3D00' },
  info: { main: '#00B0FF' },
  primary: { main: '#2962FF', contrastText: '#FFF' },
  secondary: { main: '#FFF' },
  success: { main: '#00E676' },
  warning: { main: '#FFC400' },
  text: {
    primary: grey['700'],
    secondary: grey['500'],
    disabled: grey['300'],
  },
  divider: grey['100'],
  background: {
    paper: '#FFF',
    default: grey['50'],
  },
  action: {
    selectedOpacity: 0,
    selected: grey['50'],
  },
};
