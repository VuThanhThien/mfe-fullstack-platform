import type { RemoteMountContext } from '@mfe/sdk';
import { createTheme, getMode, subscribeMode } from '@mfe/ui';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ArticleHubPage } from './pages/article/ArticleHubPage';
import { CategoriesPage } from './pages/product/CategoriesPage';
import { CategoryDetailPage } from './pages/product/CategoryDetailPage';
import { ProductDetailPage } from './pages/product/ProductDetailPage';
import { ProductListPage } from './pages/product/ProductListPage';
import { SyncedMemoryRouter } from '@mfe/sdk/react-router';

type ProductAppProps = RemoteMountContext;

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  });
}

export function ProductApp({ basePath }: ProductAppProps) {
  const [mode, setModeState] = useState(getMode);
  const [queryClient] = useState(createClient);

  useEffect(() => subscribeMode(setModeState), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={createTheme(mode)}>
        <CssBaseline />
        <SyncedMemoryRouter basePath={basePath}>
          <Box>
            <Routes>
              <Route index element={<ProductListPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route
                path="categories/:categoryId"
                element={<CategoryDetailPage />}
              />
              <Route path=":productId" element={<ProductDetailPage />} />
              <Route path="*" element={<ProductListPage />} />
            </Routes>
          </Box>
        </SyncedMemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Articles hub — separate shell widget (`routeName=article`), same bundle. */
export function ArticleApp({ basePath }: ProductAppProps) {
  const [mode, setModeState] = useState(getMode);
  const [queryClient] = useState(createClient);

  useEffect(() => subscribeMode(setModeState), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={createTheme(mode)}>
        <CssBaseline />
        <SyncedMemoryRouter basePath={basePath}>
          <Box>
            <Routes>
              <Route index element={<ArticleHubPage />} />
              <Route path="*" element={<ArticleHubPage />} />
            </Routes>
          </Box>
        </SyncedMemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
