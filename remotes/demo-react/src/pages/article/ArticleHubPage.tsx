import { Box, List, ListItemText, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchArticles } from '../../fixtures/catalog';

/** Shell Articles widget — list only (`routeName=article`). */
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
