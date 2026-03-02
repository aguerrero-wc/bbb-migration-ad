import { Link } from 'react-router-dom';

import { buttonVariants } from '@/shared/components/ui/button';

export function NotFoundPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4"
      data-testid="not-found-page"
    >
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <Link to="/" className={buttonVariants({ variant: 'outline' })} data-testid="go-home-link">
        Go back home
      </Link>
    </div>
  );
}
