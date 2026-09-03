import { useEffect, useState } from 'react';
import { signedUrl } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface Props {
  path: string;
  alt: string;
  className?: string;
}

/** Renders an image stored in the private assets bucket via a short-lived signed URL. */
const SignedImage = ({ path, alt, className }: Props) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let active = true;
    signedUrl(path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [path]);

  if (!url) return <div className={cn('bg-[#f1f1f1] animate-pulse', className)} aria-hidden />;
  return <img src={url} alt={alt} loading="lazy" decoding="async" className={className} />;
};

export default SignedImage;
