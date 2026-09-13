import { Navigate } from 'react-router-dom';

/** Old /creator/submissions links land on the My campaigns tab. */
const CreatorSubmissions = () => <Navigate to="/creator?tab=mine" replace />;

export default CreatorSubmissions;
