import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { ErrorMailDescription, ErrorPoster, type ErrorPosterAction } from '@/components/ErrorPoster';
import { signedOutPath } from '@/lib/auth-routes';
import { httpErrorCopy, type HttpErrorCode } from '@/lib/http-errors';
import { notFoundHome } from '@/lib/not-found';
import { roleAppHref } from '@/lib/hosts';

type HttpErrorPageProps = {
  code: HttpErrorCode;
};

const HttpErrorPage = ({ code }: HttpErrorPageProps) => {
  const copy = httpErrorCopy(code);
  const { user, profile } = useAuth();
  const home = notFoundHome(Boolean(user), profile?.role);
  const homeHref = user ? roleAppHref(profile?.role, home.path) : home.path;

  const actions: ErrorPosterAction[] =
    copy.kind === 'sign-in'
      ? [
          { label: 'Sign in', href: signedOutPath() },
          { label: home.label, href: homeHref, variant: 'invofyOutline' },
        ]
      : copy.kind === 'retry'
        ? [
            { label: 'Try again', onClick: () => window.location.reload() },
            { label: home.label, href: homeHref, variant: 'invofyOutline' },
          ]
        : [
            { label: home.label, href: homeHref },
            { label: 'Contact', href: '/contact', variant: 'invofyOutline' },
          ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ErrorPoster
        overlayNav
        watermark={String(code)}
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.support ? <ErrorMailDescription text={copy.description} /> : copy.description}
        documentTitle={copy.documentTitle}
        chip={`HTTP ${code}`}
        lead={<PageBreadcrumbs align="start" className="mb-5 max-md:justify-center" />}
        actions={actions}
      />
    </div>
  );
};

export default HttpErrorPage;
