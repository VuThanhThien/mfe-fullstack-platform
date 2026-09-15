import { Box, Link as MuiLink, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  fetchCategory,
  fetchProducts,
} from '../../fixtures/catalog';

export function CategoryDetailPage() {
  const { categoryId = '' } = useParams();
  const categoryQuery = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => fetchCategory(categoryId),
    enabled: Boolean(categoryId),
  });
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const products =
    productsQuery.data?.filter((p) => p.categoryId === categoryId) ?? [];

  return (
    <Box data-testid="category-detail">
      {categoryQuery.isPending ? <Typography>Loading…</Typography> : null}
      {categoryQuery.data ? (
        <>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {categoryQuery.data.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {categoryQuery.data.description}
          </Typography>
          <List dense>
            {products.map((p) => (
              <ListItemButton key={p.id} component={Link} to={`/${p.id}`}>
                <ListItemText primary={p.name} secondary={p.summary} />
              </ListItemButton>
            ))}
          </List>
          <MuiLink component={Link} to="/categories" underline="hover">
            All categories
          </MuiLink>
        </>
      ) : null}
      {!categoryQuery.isPending && !categoryQuery.data ? (
        <Typography color="error">Category not found.</Typography>
      ) : null}
    </Box>
  );
}
