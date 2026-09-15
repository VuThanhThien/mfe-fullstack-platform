import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionGate } from './SessionGate.js';

function wrap(ui: ReactElement) {
  return render(ui);
}

describe('SessionGate', () => {
  it('renders children when bootstrap resolves', async () => {
    const bootstrap = vi.fn().mockResolvedValue(undefined);
    wrap(
      <SessionGate
        bootstrap={bootstrap}
        renderLogin={() => <div>login</div>}
      >
        <div>app</div>
      </SessionGate>,
    );

    expect(await screen.findByText('app')).toBeTruthy();
    expect(screen.queryByText('login')).toBeNull();
  });

  it('renders login when bootstrap rejects', async () => {
    const bootstrap = vi.fn().mockRejectedValue({ status: 401 });
    wrap(
      <SessionGate
        bootstrap={bootstrap}
        renderLogin={({ unreachable }) => (
          <div>{unreachable ? 'unreachable' : 'login'}</div>
        )}
      >
        <div>app</div>
      </SessionGate>,
    );

    expect(await screen.findByText('login')).toBeTruthy();
    expect(screen.queryByText('app')).toBeNull();
  });

  it('passes unreachable when bootstrap fails with status 0', async () => {
    const bootstrap = vi.fn().mockRejectedValue({ status: 0, message: 'network' });
    wrap(
      <SessionGate
        bootstrap={bootstrap}
        renderLogin={({ unreachable }) => (
          <div>{unreachable ? 'unreachable' : 'login'}</div>
        )}
      >
        <div>app</div>
      </SessionGate>,
    );

    expect(await screen.findByText('unreachable')).toBeTruthy();
  });

  it('retry re-runs bootstrap', async () => {
    const user = userEvent.setup();
    const bootstrap = vi
      .fn()
      .mockRejectedValueOnce({ status: 0 })
      .mockResolvedValueOnce(undefined);

    wrap(
      <SessionGate
        bootstrap={bootstrap}
        renderLogin={({ unreachable, retry }) => (
          <div>
            <span>{unreachable ? 'unreachable' : 'login'}</span>
            <button type="button" onClick={retry}>
              Retry
            </button>
          </div>
        )}
      >
        <div>app</div>
      </SessionGate>,
    );

    expect(await screen.findByText('unreachable')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => {
      expect(screen.getByText('app')).toBeTruthy();
    });
    expect(bootstrap).toHaveBeenCalledTimes(2);
  });
});
