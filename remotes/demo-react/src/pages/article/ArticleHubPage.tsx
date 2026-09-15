import { Box, List, ListItemText, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchArticles } from '../../fixtures/catalog';

/** Shell-nav Articles surface — separate expose, same bundle. */
export function ArticleHubPage() {
  const { data, isPending } = useQuery({
    queryKey: ['articles', { hubOnly: true }],
    queryFn: () => fetchArticles({ hubOnly: true }),
  });

  return (
    <Box data-testid="article-hub" sx={{ p: 1 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Articles
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Separate shell nav entry (`routeName=article`) from the same{' '}
        <code>productReact</code> remote — not nested under Products.
      </Typography>
      {isPending ? <Typography variant="body2">Loading…</Typography> : null}
      {data ? (
        <List dense>
          {data.map((a) => (
            <ListItemText
              key={a.id}
              primary={a.title}
              secondary={a.excerpt}
              sx={{ mb: 1 }}
            />
          ))}
        </List>
      ) : null}
    </Box>
  );
}
