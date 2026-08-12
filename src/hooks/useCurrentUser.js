import { useSelector } from "react-redux";

const useCurrentUser = () => {
    return useSelector((state) => state.auth.user);
};

export default useCurrentUser;