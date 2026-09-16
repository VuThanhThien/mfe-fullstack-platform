import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ActivityWidget } from './ActivityWidget.js';
import { OverviewWidget } from './OverviewWidget.js';

function wrap(ui: ReactElement) {
  return render(<ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>);
}

describe('widgets smoke', () => {
  it('OverviewWidget shows title', () => {
    wrap(<OverviewWidget title="20 700" description="Visits" />);
    expect(screen.getByText('20 700')).toBeTruthy();
    expect(screen.getByText('Visits')).toBeTruthy();
  });

  it('ActivityWidget empty series does not throw', () => {
    expect(() =>
      wrap(<ActivityWidget title="Activity" series={[]} />),
    ).not.toThrow();
    expect(screen.getByText('Activity')).toBeTruthy();
  });
});
