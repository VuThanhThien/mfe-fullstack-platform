import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoolean } from 'usehooks-ts';
import { useNotify } from '../context/notify-context';
import { describeApiError } from '../lib/errors';

/**
 * Submit plumbing shared by every create/edit page: form-level error string,
 * busy flag, and a hop back to the parent list on success. `submitting` stays
 * true after success on purpose — the page navigates away immediately.
 * Surfaces success/error via optional shell onNotify (Snackbar).
 */
export function useFormSubmit<TValues>(
  save: (values: TValues) => Promise<unknown>,
  { successMessage = 'Saved' }: { successMessage?: string } = {},
) {
  const navigate = useNavigate();
  const onNotify = useNotify();
  const [error, setError] = useState<string | null>(null);
  const {
    value: submitting,
    setTrue: startSubmitting,
    setFalse: stopSubmitting,
  } = useBoolean(false);

  const submit = async (values: TValues) => {
    setError(null);
    startSubmitting();
    try {
      await save(values);
      onNotify?.({ level: 'success', message: successMessage });
      navigate('..');
    } catch (err) {
      const message = describeApiError(err);
      setError(message);
      onNotify?.({ level: 'error', message });
      stopSubmitting();
    }
  };

  return { error, submitting, submit };
}
