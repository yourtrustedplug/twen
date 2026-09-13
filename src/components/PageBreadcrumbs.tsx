import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { resolvePageSeo } from '@/lib/seo';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  align?: 'center' | 'start';
};

/** Visible trail for public marketing/legal routes (JSON-LD is set in Seo). */
export function PageBreadcrumbs({ className, align = 'center' }: Props) {
  const { pathname } = useLocation();
  const crumbs = resolvePageSeo(pathname).breadcrumbs;
  if (!crumbs || crumbs.length < 2) return null;

  return (
    <Breadcrumb
      className={cn(align === 'center' && 'flex justify-center', className)}
    >
      <BreadcrumbList
        className={cn(
          'text-xs font-medium tracking-[0.04em] text-foreground/55',
          align === 'center' && 'justify-center',
        )}
      >
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.path}:${crumb.name}`}>
              {index > 0 ? <BreadcrumbSeparator className="text-foreground/35" /> : null}
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage className="text-foreground/80">{crumb.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path} className="hover:text-foreground">
                      {crumb.name}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
