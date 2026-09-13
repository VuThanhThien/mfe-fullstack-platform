import { Button, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

interface FormActionsProps {
  submitLabel: string;
  busy: boolean;
}

/** Submit + cancel pair; cancel goes back to the parent list route. */
export function FormActions({ submitLabel, busy }: FormActionsProps) {
  return (
    <Stack direction="row" spacing={1}>
      <Button type="submit" variant="contained" disabled={busy}>
        {submitLabel}
      </Button>
      <Button component={RouterLink} to=".." disabled={busy}>
        Cancel
      </Button>
    </Stack>
  );
}
