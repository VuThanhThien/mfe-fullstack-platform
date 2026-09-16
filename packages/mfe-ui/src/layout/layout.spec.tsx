import { createTheme, List, ListItemText, ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
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
