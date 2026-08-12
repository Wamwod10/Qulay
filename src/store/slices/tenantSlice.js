import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    company: {
        id: "company-dev",
        name: "Asosiy kompaniya",
    },

    branch: {
        id: "branch-main",
        name: "Asosiy filial",
    },

    warehouse: {
        id: "warehouse-main",
        name: "Asosiy ombor",
    },

    companies: [],
    branches: [],
    warehouses: [],

    isInitialized: true,
};

const tenantSlice = createSlice({
    name: "tenant",

    initialState,

    reducers: {
        setCompany: (state, action) => {
            state.company = action.payload;
        },

        setBranch: (state, action) => {
            state.branch = action.payload;
        },

        setWarehouse: (state, action) => {
            state.warehouse = action.payload;
        },

        setCompanies: (state, action) => {
            state.companies = action.payload;
        },

        setBranches: (state, action) => {
            state.branches = action.payload;
        },

        setWarehouses: (state, action) => {
            state.warehouses = action.payload;
        },

        resetTenant: () => initialState,
    },
});

export const {
    setCompany,
    setBranch,
    setWarehouse,
    setCompanies,
    setBranches,
    setWarehouses,
    resetTenant,
} = tenantSlice.actions;

export default tenantSlice.reducer;