import { useSelector } from "react-redux";

const useCompany = () => {
    const company = useSelector(
        (state) => state.tenant.company,
    );

    const companies = useSelector(
        (state) => state.tenant.companies,
    );

    return {
        company,
        companies,
    };
};

export default useCompany;