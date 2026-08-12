import {
    createApi,
    fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";

import { API_CONFIG } from "./apiConfig";

const baseQuery = fetchBaseQuery({
    baseUrl: API_CONFIG.baseUrl,

    credentials: "include",

    prepareHeaders: (headers, { getState }) => {
        const state = getState();

        const accessToken =
            state.auth?.accessToken;

        const companyId =
            state.tenant?.company?.id;

        const branchId =
            state.tenant?.branch?.id;

        const warehouseId =
            state.tenant?.warehouse?.id;

        headers.set(
            "Accept",
            API_CONFIG.headers.accept,
        );

        headers.set(
            "Content-Type",
            API_CONFIG.headers.contentType,
        );

        if (accessToken) {
            headers.set(
                "Authorization",
                `Bearer ${accessToken}`,
            );
        }

        if (companyId) {
            headers.set(
                "X-Company-Id",
                companyId,
            );
        }

        if (branchId) {
            headers.set(
                "X-Branch-Id",
                branchId,
            );
        }

        if (warehouseId) {
            headers.set(
                "X-Warehouse-Id",
                warehouseId,
            );
        }

        return headers;
    },
});

export const baseApi = createApi({
    reducerPath: "api",

    baseQuery,

    tagTypes: [
        "Auth",
        "User",

        "Company",
        "Branch",
        "Warehouse",

        "Product",
        "Inventory",

        "Purchase",
        "Supplier",

        "Manufacturing",

        "Sale",
        "Customer",

        "Finance",

        "Employee",

        "Report",

        "Notification",

        "Settings",

        "Subscription",
    ],

    endpoints: () => ({}),
});