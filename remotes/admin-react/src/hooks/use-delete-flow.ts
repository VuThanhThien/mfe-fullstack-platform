import { useState } from 'react';
import { useBoolean } from 'usehooks-ts';
import { useNotify } from '../context/notify-context';
import { describeApiError } from '../lib/errors';

interface DeleteFlowOptions<T> {
  remove: (target: T) => Promise<void>;
  /** Refresh the list once the row is gone. */
  onDeleted: () => void | Promise<void>;
  onError: (message: string) => void;
  successMessage?: string;
}

/** Ask → confirm → delete → refresh, shared by the three list pages. */
export function useDeleteFlow<T>({
  remove,
  onDeleted,
  onError,
  successMessage = 'Deleted',
}: DeleteFlowOptions<T>) {
  const onNotify = useNotify();
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
      onNotify?.({ level: 'success', message: successMessage });
      await onDeleted();
    } catch (err) {
      setTarget(null);
      const message = describeApiError(err);
      onError(message);
      onNotify?.({ level: 'error', message });
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
