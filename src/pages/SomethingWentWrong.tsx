import { ErrorMailDescription, ErrorPoster } from '@/components/ErrorPoster';
import { httpErrorCopy } from '@/lib/http-errors';

type SomethingWentWrongProps = {
  onRetry?: () => void;
  homeHref?: string;
};

const SomethingWentWrong = ({
  onRetry = () => window.location.reload(),
  homeHref = '/',
}: SomethingWentWrongProps) => {
  const copy = httpErrorCopy(500);
  return (
    <ErrorPoster
      plainAnchors
      logoHref={homeHref}
      documentTitle={copy.documentTitle}
      watermark="500"
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={<ErrorMailDescription text={copy.description} />}
      actions={[
        { label: 'Try again', onClick: onRetry },
        { label: 'Go home', href: homeHref, variant: 'invofyOutline' },
      ]}
    />
  );
};

export default SomethingWentWrong;
