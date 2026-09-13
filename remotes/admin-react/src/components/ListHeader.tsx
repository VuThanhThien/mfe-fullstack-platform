import { Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

interface ListHeaderProps {
  title: string;
  createLabel: string;
}

/** List page heading with the link to the sibling `new` route. */
export function ListHeader({ title, createLabel }: ListHeaderProps) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      mb={2}
    >
      <Typography variant="h6">{title}</Typography>
      <Button component={RouterLink} to="new" variant="contained" size="small">
        {createLabel}
      </Button>
    </Stack>
  );
}
