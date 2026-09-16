import type { RemoteMountContext } from '@mfe/sdk';
import { createTheme, getMode, PageToolbar, subscribeMode } from '@mfe/ui';
import {
  Box,
  CssBaseline,
  Link as MuiLink,
  ThemeProvider,
} from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { ArticleHubPage } from './pages/article/ArticleHubPage';
import { CategoriesPage } from './pages/product/CategoriesPage';
import { CategoryDetailPage } from './pages/product/CategoryDetailPage';
import { ProductArticlesPage } from './pages/product/ProductArticlesPage';
import { ProductDetailPage } from './pages/product/ProductDetailPage';
import { ProductListPage } from './pages/product/ProductListPage';

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
        <BrowserRouter basename={basePath}>
          <Box>
            <PageToolbar title="Products">
              <MuiLink component={Link} to="/" underline="hover">
                Products
              </MuiLink>
              <MuiLink component={Link} to="/categories" underline="hover">
                Categories
              </MuiLink>
            </PageToolbar>
            <Routes>
              <Route index element={<ProductListPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route
                path="categories/:categoryId"
                element={<CategoryDetailPage />}
              />
              <Route path=":productId" element={<ProductDetailPage />} />
              <Route
                path=":productId/articles"
                element={<ProductArticlesPage />}
              />
              <Route path="*" element={<ProductListPage />} />
            </Routes>
          </Box>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Thin Articles hub for the separate shell nav expose. */
export function ArticleApp({ basePath }: ProductAppProps) {
  const [mode, setModeState] = useState(getMode);
  const [queryClient] = useState(createClient);

  useEffect(() => subscribeMode(setModeState), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={createTheme(mode)}>
        <CssBaseline />
        <BrowserRouter basename={basePath}>
          <Box>
            <PageToolbar title="Articles" />
            <Routes>
              <Route index element={<ArticleHubPage />} />
              <Route path="*" element={<ArticleHubPage />} />
            </Routes>
          </Box>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
