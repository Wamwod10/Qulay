import { useSelector } from "react-redux";

const useBranch = () => {
  const branch = useSelector(
    (state) => state.tenant.branch,
  );

  const branches = useSelector(
    (state) => state.tenant.branches,
  );

  return {
    branch,
    branches,
  };
};

export default useBranch;