import { Navigate, useLocation } from "react-router-dom";
import { canAccessModule, isAdminSessionActive, readTrialAccess } from "../utils/trialAccess";

export default function TrialAccessGate({ module, children }) {
  const location = useLocation();
  const session = readTrialAccess();

  if (isAdminSessionActive()) {
    return children;
  }

  if (session && canAccessModule(session, module)) {
    return children;
  }

  const params = new URLSearchParams();
  params.set("module", module);
  params.set("next", `${location.pathname}${location.search}`);
  return <Navigate to={`/trial-access?${params.toString()}`} replace />;
}
