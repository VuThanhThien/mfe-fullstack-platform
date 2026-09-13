import { useEffect, useState } from 'react';
import { listScopes } from '../lib/api/scopes';
import { describeApiError } from '../lib/errors';
import type { ScopeDto } from '../lib/types';

/** Scope options for the form multi-selects; fetched once per mount. */
export function useScopeOptions() {
  const [options, setOptions] = useState<ScopeDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listScopes()
      .then((page) => {
        if (!cancelled) setOptions(page.data);
      })
      .catch((err) => {
        if (!cancelled) setError(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { options, error };
}
