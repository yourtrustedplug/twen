import { useLocation } from 'react-router-dom';
import BookMe from '@/pages/BookMe';
import NotFound from '@/pages/NotFound';
import { isBookMePath } from '@/lib/book-me';

/** `/@slug` is not a React Router param (the @ is literal). Catch it here. */
const PublicFallback = () => {
  const { pathname } = useLocation();
  if (isBookMePath(pathname)) return <BookMe />;
  return <NotFound />;
};

export default PublicFallback;
