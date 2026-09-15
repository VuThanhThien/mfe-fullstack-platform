import { Box, Link as MuiLink, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchProducts } from '../../fixtures/catalog';

export function ProductListPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  return (
    <Box data-testid="product-home">
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Products
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Primary surface — categories nest under this tree (no separate Category
        expose).
      </Typography>
      {isPending ? <Typography variant="body2">Loading…</Typography> : null}
      {isError ? (
        <Typography variant="body2" color="error">
          Failed to load products.
        </Typography>
      ) : null}
      {data ? (
        <List dense>
          {data.map((p) => (
            <ListItemButton
              key={p.id}
              component={Link}
              to={`/${p.id}`}
              data-testid={`product-row-${p.id}`}
            >
              <ListItemText primary={p.name} secondary={p.summary} />
            </ListItemButton>
          ))}
        </List>
      ) : null}
      <MuiLink component={Link} to="/categories" underline="hover">
        Browse categories
      </MuiLink>
    </Box>
  );
}
