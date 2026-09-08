import SignedImage from '@/components/SignedImage';
import { BRAND_SOCIALS, kitHasAssets, type BrandKit } from '@/lib/brand-kit';
import { ExternalLink } from 'lucide-react';

const ColorSwatch = ({ hex, label }: { hex: string; label: string }) => {
  if (!hex) return null;
  return (
    <div className="flex items-center gap-3">
      <span
        className="h-10 w-10 rounded-xl border border-[#e9e9e9] shrink-0"
        style={{ backgroundColor: hex }}
        aria-hidden
      />
      <div>
        <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{hex}</p>
      </div>
    </div>
  );
};

export function BrandKitCard({ kit, className }: { kit: BrandKit; className?: string }) {
  if (!kitHasAssets(kit)) return null;

  const socials = BRAND_SOCIALS.filter(({ id }) => kit.socials[id]);

  return (
    <div className={className ?? 'bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-6 mb-6'}>
      <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground">Brand kit</p>

      {(kit.logo || kit.logo_dark) && (
        <div className="flex flex-wrap gap-6">
          {kit.logo && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Logo</p>
              <div className="h-16 w-16 rounded-[14px] overflow-hidden bg-white border border-[#e9e9e9]">
                <SignedImage path={kit.logo} alt="Brand logo" className="h-full w-full object-contain p-1" />
              </div>
            </div>
          )}
          {kit.logo_dark && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Logo on dark</p>
              <div className="h-16 w-16 rounded-[14px] overflow-hidden bg-[#111] border border-[#111]">
                <SignedImage path={kit.logo_dark} alt="Brand logo on dark" className="h-full w-full object-contain p-1" />
              </div>
            </div>
          )}
        </div>
      )}

      {(kit.primary || kit.secondary) && (
        <div className="flex flex-wrap gap-6">
          <ColorSwatch hex={kit.primary} label="Primary" />
          <ColorSwatch hex={kit.secondary} label="Secondary" />
        </div>
      )}

      {kit.website && (
        <div>
          <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-2">Website</p>
          <a
            href={kit.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 break-all"
          >
            {kit.website} <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
      )}

      {socials.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-3">Socials</p>
          <div className="flex flex-wrap gap-2">
            {socials.map(({ id, label }) => (
              <a
                key={id}
                href={kit.socials[id]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm bg-white border border-[#e9e9e9] rounded-full px-4 py-1.5 hover:border-primary"
              >
                {label} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
