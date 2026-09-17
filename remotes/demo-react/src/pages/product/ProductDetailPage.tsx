import { Box, Link as MuiLink, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { fetchProduct } from '../../fixtures/catalog';

export function ProductDetailPage() {
  const { productId = '' } = useParams();
  const { data, isPending } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId),
    enabled: Boolean(productId),
  });

  return (
    <Box data-testid="product-detail">
      {isPending ? <Typography>Loading…</Typography> : null}
      {!isPending && !data ? (
        <Typography color="error">Product not found.</Typography>
      ) : null}
      {data ? (
        <>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {data.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {data.summary}
          </Typography>
          <MuiLink component={Link} to="/" underline="hover">
            All products
          </MuiLink>
        </>
      ) : null}
    </Box>
  );
}
