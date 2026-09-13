import SignedImage from '@/components/SignedImage';
import BrandMark from '@/components/BrandMark';
import { Logo } from '@/logos';
import { cn } from '@/lib/utils';

const ChatAvatar = ({
  name,
  avatarUrl,
  official,
  mark,
  color,
  seed,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  official?: boolean;
  mark?: boolean;
  color?: string | null;
  seed?: string;
  className?: string;
}) => {
  if (official) {
    return (
      <div className={cn('rounded-full overflow-hidden bg-[#0A101D] shrink-0', className)}>
        <Logo variant="icon" className="w-full h-full" title={name} />
      </div>
    );
  }
  if (!mark && avatarUrl) {
    return <SignedImage path={avatarUrl} alt={name} className={cn('block rounded-full object-cover', className)} />;
  }
  return <BrandMark name={name} color={color} seed={seed} className={className} />;
};

export default ChatAvatar;
