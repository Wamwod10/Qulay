import { useCallback, useState } from "react";

import { getStoredAgents } from "../utils/agentsStorage";

export const useAgents = () => {
  const [agents, setAgents] = useState(() => getStoredAgents());

  const refreshAgents = useCallback(() => {
    setAgents(getStoredAgents());
  }, []);

  return {
    agents,
    isLoading: false,
    refreshAgents,
  };
};

export default useAgents;
