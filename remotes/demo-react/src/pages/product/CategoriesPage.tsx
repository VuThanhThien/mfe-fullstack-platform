import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchCategories } from '../../fixtures/catalog';

export function CategoriesPage() {
  const { data, isPending } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  return (
    <Box data-testid="product-categories">
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Categories
      </Typography>
      {isPending ? <Typography variant="body2">Loading…</Typography> : null}
      {data ? (
        <List dense>
          {data.map((c) => (
            <ListItemButton
              key={c.id}
              component={Link}
              to={`/categories/${c.id}`}
              data-testid={`category-row-${c.id}`}
            >
              <ListItemText primary={c.name} secondary={c.description} />
            </ListItemButton>
          ))}
        </List>
      ) : null}
    </Box>
  );
}
