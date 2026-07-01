import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import './styles/global.css';
import { AppShell } from './ui/AppShell';
import { StocktakePage } from './features/stocktake/StocktakePage';
import { StocktakeListPage } from './features/stocktake/StocktakeListPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Navigate to="/inventory/stocktakes" replace /> },
      { path: '/inventory/stocktakes', element: <StocktakeListPage /> },
      { path: '/inventory/stocktakes/:stocktakeId', element: <StocktakePage /> },
      // keep the old direct route working
      { path: '/stocktake/:stocktakeId', element: <StocktakePage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
