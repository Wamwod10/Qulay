import { Skeleton } from "../../../shared/ui";

import "./RouteFallback.scss";

const RouteFallback = () => (
  <div className="route-fallback" aria-label="Sahifa yuklanmoqda">
    <Skeleton width={190} height={22} />
    <Skeleton width="100%" height={92} radius={12} />
    <Skeleton width="100%" height={260} radius={12} />
  </div>
);

export default RouteFallback;
