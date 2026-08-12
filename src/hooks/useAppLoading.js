import { useSelector } from "react-redux";

const useAppLoading = () => {
    return useSelector(
        (state) => state.app.globalLoading,
    );
};

export default useAppLoading;