import type { ReactElement } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme, List, ListItemText } from '@mui/material';
import { AppFooter } from './AppFooter.js';
import { NavDrawer } from './NavDrawer.js';

function wrap(ui: ReactElement) {
  return render(<ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>);
}

describe('layout kit', () => {
  it('AppFooter renders text', () => {
    wrap(<AppFooter text="MFE Platform footer" />);
    expect(screen.getByText('MFE Platform footer')).toBeTruthy();
  });

  it('NavDrawer renders children', () => {
    wrap(
      <NavDrawer variant="permanent">
        <List>
          <ListItemText primary="Demo" />
        </List>
      </NavDrawer>,
    );
    expect(screen.getByText('Demo')).toBeTruthy();
  });
});
