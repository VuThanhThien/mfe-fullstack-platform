import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

export type SessionGateLoginContext = {
  /** True when bootstrap failed with transport/unreachable (`status === 0`). */
  unreachable: boolean;
  /** Re-run bootstrap (e.g. Retry after API unreachable). */
  retry: () => void;
};

export type SessionGateProps = {
  /** App supplies `() => refresh()` from `@mfe/sdk`. */
  bootstrap: () => Promise<void>;
  /** Render login UI when bootstrap fails. */
  renderLogin: (ctx: SessionGateLoginContext) => ReactNode;
  children: ReactNode;
};

type GateState =
  | { kind: 'checking' }
  | { kind: 'ready' }
  | { kind: 'login'; unreachable: boolean };

function isUnreachableError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    'status' in err &&
    (err as { status: unknown }).status === 0
  );
}

/**
 * Standalone session bootstrap. Hosted remotes must NOT wrap mount trees in this.
 *
 * `bootstrap` is read from a ref so inline lambdas from the app do not re-fire
 * the effect every render.
 */
export function SessionGate({
  bootstrap,
  renderLogin,
  children,
}: SessionGateProps) {
  const [state, setState] = useState<GateState>({ kind: 'checking' });
  const bootstrapRef = useRef(bootstrap);
  bootstrapRef.current = bootstrap;

  const runBootstrap = useCallback(() => {
    setState({ kind: 'checking' });
    bootstrapRef
      .current()
      .then(() => {
        setState({ kind: 'ready' });
      })
      .catch((err: unknown) => {
        setState({
          kind: 'login',
          unreachable: isUnreachableError(err),
        });
      });
  }, []);

  useEffect(() => {
    runBootstrap();
  }, [runBootstrap]);

  if (state.kind === 'checking') {
    return null;
  }

  if (state.kind === 'login') {
    return (
      <>
        {renderLogin({
          unreachable: state.unreachable,
          retry: runBootstrap,
        })}
      </>
    );
  }

  return <>{children}</>;
}
