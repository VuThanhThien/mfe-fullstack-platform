import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { LoginForm } from './LoginForm.js';

function wrap(ui: ReactElement) {
  return render(<ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>);
}

describe('LoginForm', () => {
  it('shows field validation errors and does not call onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    wrap(<LoginForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/valid email/i)).toBeTruthy();
    expect(screen.getByText(/password is required/i)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    wrap(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret12');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret12',
      });
    });
  });

  it('displays the error prop', () => {
    wrap(<LoginForm onSubmit={vi.fn()} error="Invalid email or password." />);
    expect(screen.getByText('Invalid email or password.')).toBeTruthy();
  });

  it('renders footer slot', () => {
    wrap(
      <LoginForm onSubmit={vi.fn()} footer={<span>No account?</span>} />,
    );
    expect(screen.getByText('No account?')).toBeTruthy();
  });
});
