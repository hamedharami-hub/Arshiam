import { Navigate, useLocation } from "react-router-dom";

/** Old /app/review?… links now live under a review folder (Pharmacy is the first one). */
export default function ReviewRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/app/review/pharmacy${search}`} replace />;
}
