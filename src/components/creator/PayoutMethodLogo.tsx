import type { ReactNode } from 'react';
import type { PayoutMethodId } from '@/lib/payout-methods';
import { cn } from '@/lib/utils';
import ecocashMark from '@/assets/payout/ecocash.png';

const Frame = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => (
  <span
    className={cn(
      'inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[7px]',
      className,
    )}
  >
    {children}
  </span>
);

const Svg = ({ children, viewBox = '0 0 32 32' }: { children: ReactNode; viewBox?: string }) => (
  <svg viewBox={viewBox} className="h-full w-full" aria-hidden>
    {children}
  </svg>
);

/** Official-color marks, sized for 28px chips. */
const PayoutMethodLogo = ({ method, className }: { method: string; className?: string }) => {
  switch (method as PayoutMethodId) {
    case 'mtn_momo':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" rx="7" fill="#FFCC00" />
            <ellipse cx="16" cy="16" rx="12.5" ry="7.2" fill="none" stroke="#111" strokeWidth="2.2" />
            <text
              x="16"
              y="19.2"
              textAnchor="middle"
              fill="#111"
              fontSize="8"
              fontWeight="800"
              fontFamily="Arial Black, Arial, sans-serif"
              letterSpacing="-0.4"
            >
              MTN
            </text>
          </Svg>
        </Frame>
      );
    case 'airtel_money':
    case 'airteltigo_money':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" rx="7" fill="#ED1C24" />
            <path
              fill="#fff"
              d="M18.2 7.2c-4.6 0-8.4 3.6-8.4 8.6 0 5.6 4.3 9.6 10.2 9.6 2.4 0 4.6-.7 6.2-2-1.4.6-3 1-4.8 1-5.2 0-8.6-3.2-8.6-8.2 0-3.8 2.6-6.6 6.2-6.6 1.6 0 3 .5 4 1.5-.8-2.2-2.5-3.9-4.8-3.9zm1.4 6.2c.2 1.8 1.5 3 3.2 3.4-.2-2-1.4-3.4-3.2-3.4z"
            />
          </Svg>
        </Frame>
      );
    case 'mpesa':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" rx="7" fill="#39B54A" />
            <text
              x="16"
              y="15"
              textAnchor="middle"
              fill="#fff"
              fontSize="7.2"
              fontWeight="800"
              fontFamily="Arial, Helvetica, sans-serif"
            >
              M-PESA
            </text>
            <path
              d="M9 20c4.4 4.8 9.6 4.8 14 0"
              fill="none"
              stroke="#E31C23"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </Svg>
        </Frame>
      );
    case 'ecocash':
      return (
        <Frame className={cn('bg-white ring-1 ring-black/5', className)}>
          <img src={ecocashMark} alt="" className="h-[70%] w-[85%] object-contain" />
        </Frame>
      );
    case 'orange_money':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" fill="#FF7900" />
          </Svg>
        </Frame>
      );
    case 'onemoney':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" rx="7" fill="#E30613" />
            <text
              x="16"
              y="20.5"
              textAnchor="middle"
              fill="#fff"
              fontSize="13"
              fontWeight="800"
              fontFamily="Arial, sans-serif"
            >
              1
            </text>
          </Svg>
        </Frame>
      );
    case 'innbucks':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" rx="7" fill="#1B4F9C" />
            <text
              x="16"
              y="20.5"
              textAnchor="middle"
              fill="#F5C518"
              fontSize="9"
              fontWeight="800"
              fontFamily="Arial, sans-serif"
            >
              IB
            </text>
          </Svg>
        </Frame>
      );
    case 'moov_money':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" rx="7" fill="#00A0E3" />
            <text
              x="16"
              y="20"
              textAnchor="middle"
              fill="#fff"
              fontSize="8"
              fontWeight="800"
              fontFamily="Arial, sans-serif"
            >
              moov
            </text>
          </Svg>
        </Frame>
      );
    case 'wave':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" rx="7" fill="#1BA3F5" />
            <path
              d="M6 18c3-6 5-6 8 0s5 6 8 0 5-6 8 0"
              fill="none"
              stroke="#fff"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </Svg>
        </Frame>
      );
    case 'telecel_cash':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" rx="7" fill="#E30613" />
            <text
              x="16"
              y="20.5"
              textAnchor="middle"
              fill="#fff"
              fontSize="14"
              fontWeight="800"
              fontFamily="Arial, sans-serif"
            >
              t
            </text>
          </Svg>
        </Frame>
      );
    case 'tnm_mpamba':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" rx="7" fill="#ED1C24" />
            <text
              x="16"
              y="20.5"
              textAnchor="middle"
              fill="#fff"
              fontSize="8"
              fontWeight="800"
              fontFamily="Arial, sans-serif"
            >
              TNM
            </text>
          </Svg>
        </Frame>
      );
    case 'mixx_yas':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" rx="7" fill="#6C2BD9" />
            <text
              x="16"
              y="20.5"
              textAnchor="middle"
              fill="#fff"
              fontSize="11"
              fontWeight="800"
              fontFamily="Arial, sans-serif"
            >
              Yas
            </text>
          </Svg>
        </Frame>
      );
    case 'emola':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" rx="7" fill="#E60000" />
            <text
              x="16"
              y="20.5"
              textAnchor="middle"
              fill="#fff"
              fontSize="7"
              fontWeight="800"
              fontFamily="Arial, sans-serif"
            >
              e-Mola
            </text>
          </Svg>
        </Frame>
      );
    case 'opay':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" rx="7" fill="#fff" />
            <circle cx="16" cy="16" r="9" fill="none" stroke="#00D2A0" strokeWidth="4" />
            <rect x="5.5" y="14" width="6" height="4" rx="1" fill="#3D2E7C" />
          </Svg>
        </Frame>
      );
    case 'palmpay':
      return (
        <Frame className={className}>
          <Svg>
            <rect width="32" height="32" rx="7" fill="#16A34A" />
            <path
              fill="#F5C518"
              d="M16 7c2.4 3.2 3.2 6 3.2 8.4 0 2.6-1.4 4.8-3.2 6.2-1.8-1.4-3.2-3.6-3.2-6.2C12.8 13 13.6 10.2 16 7z"
            />
            <rect x="14.6" y="18" width="2.8" height="7" rx="1.2" fill="#14532D" />
          </Svg>
        </Frame>
      );
    default:
      return (
        <Frame className={cn('bg-[#f1f1f1]', className)}>
          <Svg>
            <text x="16" y="21" textAnchor="middle" fill="#111" fontSize="14" fontWeight="700">
              $
            </text>
          </Svg>
        </Frame>
      );
  }
};

export default PayoutMethodLogo;
