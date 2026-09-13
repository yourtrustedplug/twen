import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { brandAnalyticsPath } from '@/lib/brand-analytics';

/** Old campaign URLs open analytics with the side panel. */
const BrandCampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  return <Navigate to={brandAnalyticsPath(id, searchParams)} replace />;
};

export default BrandCampaignDetail;
