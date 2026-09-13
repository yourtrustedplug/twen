import { ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/logos';
import { isAbsoluteHref } from '@/lib/not-found';
import { SUPPORT_EMAIL } from '@/lib/http-errors';
import { cn } from '@/lib/utils';
import heroBackground from '@/assets/hero-background.jpg';

export type ErrorPosterAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'invofy' | 'invofyOutline';
};

export function ErrorMailDescription({ text }: { text: string }): ReactNode {
  const at = text.indexOf(SUPPORT_EMAIL);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="font-medium text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground"
      >
        {SUPPORT_EMAIL}
      </a>
      {text.slice(at + SUPPORT_EMAIL.length)}
    </>
  );
}

type ErrorPosterProps = {
  watermark: string;
  eyebrow: string;
  title: string;
  description: ReactNode;
  chip?: string;
  actions?: ErrorPosterAction[];
  /** Fixed logo bar for public screens that are not inside Navbar. */
  logoHref?: string;
  /** Extra top padding when a fixed Navbar overlays the poster. */
  overlayNav?: boolean;
  /** Sit under AppHeader instead of filling the whole window as a marketing poster. */
  underChrome?: boolean;
  /** Force <a> so the poster works outside a Router (crash, config). */
  plainAnchors?: boolean;
  lead?: ReactNode;
  children?: ReactNode;
  documentTitle?: string;
};

const ActionButton = ({
  action,
  plainAnchors,
}: {
  action: ErrorPosterAction;
  plainAnchors?: boolean;
}) => {
  const variant = action.variant ?? 'invofy';
  if (action.onClick) {
    return (
      <Button variant={variant} size="invofy" type="button" onClick={action.onClick}>
        {action.label}
      </Button>
    );
  }
  const href = action.href ?? '/';
  const useAnchor = plainAnchors || isAbsoluteHref(href);
  return (
    <Button variant={variant} size="invofy" asChild>
      {useAnchor ? <a href={href}>{action.label}</a> : <Link to={href}>{action.label}</Link>}
    </Button>
  );
};

export function ErrorPoster({
  watermark,
  eyebrow,
  title,
  description,
  chip,
  actions,
  logoHref,
  overlayNav,
  underChrome,
  plainAnchors,
  lead,
  children,
  documentTitle,
}: ErrorPosterProps) {
  const logoIsAnchor = Boolean(logoHref && (plainAnchors || isAbsoluteHref(logoHref)));

  useEffect(() => {
    if (!documentTitle) return;
    document.title = documentTitle;
  }, [documentTitle]);

  return (
    <div className={cn(underChrome ? 'flex flex-1 flex-col' : 'min-h-screen bg-background')}>
      {logoHref ? (
        <header className="fixed inset-x-0 top-0 z-50 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="px-5 py-2 md:px-10">
            {logoIsAnchor ? (
              <a href={logoHref} className="inline-flex items-center gap-2 no-underline">
                <Logo
                  variant="full"
                  iconClassName="w-[26px] h-[26px] md:w-[22px] md:h-[22px]"
                  wordmarkClassName="text-[1.675rem] max-xs:text-[1.5rem]"
                />
              </a>
            ) : (
              <Link to={logoHref ?? '/'} className="inline-flex items-center gap-2 no-underline">
                <Logo
                  variant="full"
                  iconClassName="w-[26px] h-[26px] md:w-[22px] md:h-[22px]"
                  wordmarkClassName="text-[1.675rem] max-xs:text-[1.5rem]"
                />
              </Link>
            )}
          </div>
        </header>
      ) : null}

      <section
        className={cn(
          'relative flex flex-col overflow-hidden bg-cover bg-center bg-no-repeat rounded-b-[4rem] max-xs:rounded-b-[2.5rem]',
          underChrome ? 'min-h-[calc(100svh-5.5rem)] flex-1' : 'min-h-[100svh]',
        )}
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <p
          aria-hidden="true"
          className="pointer-events-none absolute right-[-8vw] top-[22%] z-0 select-none font-display text-[42vw] font-bold leading-none text-foreground/[0.07] md:top-auto md:bottom-[-10vw] md:text-[min(40vw,20rem)]"
        >
          {watermark}
        </p>

        <div
          className={cn(
            'relative z-10 flex flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-10',
            overlayNav || logoHref
              ? 'pt-[max(5.75rem,calc(env(safe-area-inset-top)+4.25rem))]'
              : 'pt-10 md:pt-14',
            underChrome || children ? '' : 'justify-center',
            underChrome ? 'min-h-[calc(100svh-5.5rem)]' : 'min-h-[100svh]',
          )}
        >
          <div
            className={cn(
              'mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-10 py-6 md:py-10',
              children ? 'justify-between' : 'justify-center',
            )}
          >
            <div className="w-full max-w-[38rem]">
              {lead}
              <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[1px] md:text-left md:text-xs">
                {eyebrow}
              </p>
              <h1 className="text-center font-display text-[clamp(2.15rem,7vw,4.5rem)] font-bold leading-[1.08] md:text-left">
                {title}
              </h1>
              <div className="mx-auto mt-4 max-w-[30rem] text-center text-base leading-[1.4] text-muted-foreground md:mx-0 md:text-left md:text-lg">
                {description}
              </div>
              {chip ? (
                <p className="mt-5 text-center md:text-left">
                  <span className="inline-block max-w-full truncate rounded-full border border-border/70 bg-background/55 px-4 py-1.5 font-['DM_Mono',ui-monospace,monospace] text-[13px] text-muted-foreground backdrop-blur-md">
                    {chip}
                  </span>
                </p>
              ) : null}
              {actions?.length ? (
                <div className="mt-8 flex flex-row flex-wrap items-center justify-center gap-3 md:justify-start">
                  {actions.map((action) => (
                    <ActionButton key={action.label} action={action} plainAnchors={plainAnchors} />
                  ))}
                </div>
              ) : null}
            </div>
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}
