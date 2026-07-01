import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import './styles/global.css';
import { DEFAULT_STOCKTAKE_ID } from './gql/client';
import { StocktakePage } from './features/stocktake/StocktakePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const router = createBrowserRouter([
  { path: '/', element: <Navigate to={`/stocktake/${DEFAULT_STOCKTAKE_ID}`} replace /> },
  { path: '/stocktake/:stocktakeId', element: <StocktakePage /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
