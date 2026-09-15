export type Product = {
  id: string;
  name: string;
  categoryId: string;
  summary: string;
};

export type Category = {
  id: string;
  name: string;
  description: string;
};

export type Article = {
  id: string;
  title: string;
  productId: string | null;
  excerpt: string;
};

export const categories: Category[] = [
  {
    id: 'cat-hardware',
    name: 'Hardware',
    description: 'Devices and accessories.',
  },
  {
    id: 'cat-software',
    name: 'Software',
    description: 'Licenses and subscriptions.',
  },
];

export const products: Product[] = [
  {
    id: 'prod-laptop',
    name: 'Pro Laptop',
    categoryId: 'cat-hardware',
    summary: '14" ultrabook for field engineers.',
  },
  {
    id: 'prod-monitor',
    name: 'Studio Monitor',
    categoryId: 'cat-hardware',
    summary: '27\" 4K display for design review.',
  },
  {
    id: 'prod-suite',
    name: 'Ops Suite',
    categoryId: 'cat-software',
    summary: 'Ops tooling license pack.',
  },
];

export const articles: Article[] = [
  {
    id: 'art-1',
    title: 'Choosing a laptop for remote ops',
    productId: 'prod-laptop',
    excerpt: 'Battery, ports, and field reliability.',
  },
  {
    id: 'art-2',
    title: 'Monitor calibration basics',
    productId: 'prod-monitor',
    excerpt: 'Colour accuracy without a lab.',
  },
  {
    id: 'art-3',
    title: 'Platform release notes',
    productId: null,
    excerpt: 'Cross-cutting articles for the hub nav.',
  },
];

/** Simulated async reads — use with React Query, not raw useEffect fetch. */
export async function fetchProducts(): Promise<Product[]> {
  await delay(40);
  return products;
}

export async function fetchProduct(id: string): Promise<Product | undefined> {
  await delay(40);
  return products.find((p) => p.id === id);
}

export async function fetchCategories(): Promise<Category[]> {
  await delay(40);
  return categories;
}

export async function fetchCategory(id: string): Promise<Category | undefined> {
  await delay(40);
  return categories.find((c) => c.id === id);
}

export async function fetchArticles(opts?: {
  productId?: string;
  hubOnly?: boolean;
}): Promise<Article[]> {
  await delay(40);
  if (opts?.hubOnly) {
    return articles.filter((a) => a.productId === null);
  }
  if (opts?.productId) {
    return articles.filter((a) => a.productId === opts.productId);
  }
  return articles;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
