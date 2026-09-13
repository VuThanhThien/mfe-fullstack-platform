import { useState } from 'react';
import { useBoolean } from 'usehooks-ts';
import { describeApiError } from '../lib/errors';

interface DeleteFlowOptions<T> {
  remove: (target: T) => Promise<void>;
  /** Refresh the list once the row is gone. */
  onDeleted: () => void | Promise<void>;
  onError: (message: string) => void;
}

/** Ask → confirm → delete → refresh, shared by the three list pages. */
export function useDeleteFlow<T>({
  remove,
  onDeleted,
  onError,
}: DeleteFlowOptions<T>) {
  const [target, setTarget] = useState<T | null>(null);
  const {
    value: busy,
    setTrue: startDeleting,
    setFalse: stopDeleting,
  } = useBoolean(false);

  const confirm = async () => {
    if (!target) return;
    startDeleting();
    try {
      await remove(target);
      setTarget(null);
      await onDeleted();
    } catch (err) {
      setTarget(null);
      onError(describeApiError(err));
    } finally {
      stopDeleting();
    }
  };

  return {
    target,
    busy,
    ask: (next: T) => setTarget(next),
    cancel: () => setTarget(null),
    confirm,
  };
}
