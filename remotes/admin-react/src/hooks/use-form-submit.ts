import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoolean } from 'usehooks-ts';
import { describeApiError } from '../lib/errors';

/**
 * Submit plumbing shared by every create/edit page: form-level error string,
 * busy flag, and a hop back to the parent list on success. `submitting` stays
 * true after success on purpose — the page navigates away immediately.
 */
export function useFormSubmit<TValues>(save: (values: TValues) => Promise<unknown>) {
  const navigate = useNavigate();
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
      navigate('..');
    } catch (err) {
      setError(describeApiError(err));
      stopSubmitting();
    }
  };

  return { error, submitting, submit };
}
