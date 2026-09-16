import {
  Box,
  List,
  ListItemText,
  Link as MuiLink,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { fetchArticles, fetchProduct } from '../../fixtures/catalog';

export function ProductArticlesPage() {
  const { productId = '' } = useParams();
  const productQuery = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId),
    enabled: Boolean(productId),
  });
  const articlesQuery = useQuery({
    queryKey: ['articles', { productId }],
    queryFn: () => fetchArticles({ productId }),
    enabled: Boolean(productId),
  });

  return (
    <Box data-testid="product-articles">
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Articles
        {productQuery.data ? ` · ${productQuery.data.name}` : ''}
      </Typography>
      {articlesQuery.isPending ? (
        <Typography variant="body2">Loading…</Typography>
      ) : null}
      {articlesQuery.data ? (
        <List dense>
          {articlesQuery.data.map((a) => (
            <ListItemText
              key={a.id}
              primary={a.title}
              secondary={a.excerpt}
              sx={{ mb: 1 }}
            />
          ))}
        </List>
      ) : null}
      <MuiLink component={Link} to={`/${productId}`} underline="hover">
        Back to product
      </MuiLink>
    </Box>
  );
}
