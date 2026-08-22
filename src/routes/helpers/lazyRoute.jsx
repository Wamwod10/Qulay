import { Suspense, lazy } from "react";

import RouteFallback from "../components/RouteFallback/RouteFallback";

export const lazyRoute = (loader) => {
  const LazyComponent = lazy(loader);

  return function LazyRouteComponent(props) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
};
