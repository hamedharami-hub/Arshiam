import { Navigate, useLocation, useParams } from "react-router-dom";

/** Old /app/review/:folder links become /app/review?domain=:folder, keeping every other query param. */
export default function ReviewRedirect() {
  const { search } = useLocation();
  const { folder } = useParams<{ folder: string }>();
  const params = new URLSearchParams(search);
  if (folder && !params.has("domain")) params.set("domain", folder);
  return <Navigate to={`/app/review?${params.toString()}`} replace />;
}
