import { Link } from 'react-router-dom';
import { HTTP_ERROR_CODES, httpErrorCopy } from '@/lib/http-errors';

/** Local-only index of numbered error posters. */
const DevErrors = () => {
  return (
    <div className="min-h-screen bg-background px-5 py-16 md:px-10">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1px]">DEV</p>
      <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">Error number pages</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Same poster as 404 and the crash screen. Open each code, then the ErrorBoundary crash.
      </p>
      <ul className="mt-10 grid max-w-xl gap-3">
        {HTTP_ERROR_CODES.map((code) => {
          const copy = httpErrorCopy(code);
          return (
            <li key={code}>
              <Link
                to={`/${code}`}
                className="flex items-baseline justify-between gap-4 rounded-[24px] border border-border/70 bg-background/70 px-5 py-4 no-underline transition-colors hover:border-foreground/30"
              >
                <span className="font-display text-2xl font-bold">{code}</span>
                <span className="text-right text-sm text-muted-foreground">{copy.title}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            to="/dev/crash"
            className="flex items-baseline justify-between gap-4 rounded-[24px] border border-border/70 bg-background/70 px-5 py-4 no-underline transition-colors hover:border-foreground/30"
          >
            <span className="font-display text-2xl font-bold">crash</span>
            <span className="text-right text-sm text-muted-foreground">ErrorBoundary · no router</span>
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default DevErrors;
