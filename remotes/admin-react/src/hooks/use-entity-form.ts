import { useEffect, useState } from 'react';
import type { FieldValues, UseFormReset } from 'react-hook-form';
import { useBoolean, useEventCallback } from 'usehooks-ts';
import { describeApiError } from '../lib/errors';

interface EntityFormOptions<TEntity, TValues extends FieldValues> {
  /** Route param; empty means there is nothing to load. */
  id: string;
  fetchEntity: (id: string) => Promise<TEntity>;
  toValues: (entity: TEntity) => TValues;
  reset: UseFormReset<TValues>;
}

/**
 * Load one record for an edit page and seed the form with `reset`.
 * Without an `id` the page stays in its loading state, so no form is ever
 * rendered against an unknown record.
 */
export function useEntityForm<TEntity, TValues extends FieldValues>({
  id,
  fetchEntity,
  toValues,
  reset,
}: EntityFormOptions<TEntity, TValues>) {
  const [entity, setEntity] = useState<TEntity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    value: loading,
    setTrue: startLoading,
    setFalse: stopLoading,
  } = useBoolean(true);

  // Stable identities so inline callers cannot re-trigger the effect.
  const load = useEventCallback(fetchEntity);
  const mapToValues = useEventCallback(toValues);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    startLoading();
    load(id)
      .then((loaded) => {
        if (cancelled) return;
        setEntity(loaded);
        reset(mapToValues(loaded));
      })
      .catch((err) => {
        if (!cancelled) setError(describeApiError(err));
      })
      .finally(() => {
        if (!cancelled) stopLoading();
      });
    return () => {
      cancelled = true;
    };
  }, [id, load, mapToValues, reset, startLoading, stopLoading]);

  return { entity, loading, error };
}
