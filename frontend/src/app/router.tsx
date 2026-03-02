import { Navigate, createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

import { ErrorBoundary } from '@/shared/components/error-boundary';
import { NotFoundPage } from '@/shared/components/not-found';
import { MainLayout } from '@/shared/layouts/main-layout';

const routes: RouteObject[] = [
  {
    path: '/',
    lazy: async () => {
      const { ProtectedRoute } = await import('@/shared/components/protected-route');
      return { Component: ProtectedRoute };
    },
    errorElement: (
      <ErrorBoundary>
        <NotFoundPage />
      </ErrorBoundary>
    ),
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/rooms" replace />,
          },
          {
            path: 'rooms',
            lazy: async () => {
              const { RoomsPage } = await import('@/features/rooms/pages/rooms-page');
              return { Component: RoomsPage };
            },
          },
          {
            path: 'reservations',
            lazy: async () => {
              const { ReservationsPage } = await import(
                '@/features/reservations/pages/reservations-page'
              );
              return { Component: ReservationsPage };
            },
          },
          {
            path: 'recordings',
            lazy: async () => {
              const { RecordingsPage } = await import(
                '@/features/recordings/pages/recordings-page'
              );
              return { Component: RecordingsPage };
            },
          },
        ],
      },
    ],
  },
  {
    path: '/auth/login',
    lazy: async () => {
      const { LoginPage } = await import('@/features/auth/pages/login-page');
      return { Component: LoginPage };
    },
  },
  {
    path: '/auth/register',
    lazy: async () => {
      const { RegisterPage } = await import('@/features/auth/pages/register-page');
      return { Component: RegisterPage };
    },
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);
