import { baseApi } from "./baseApi";

export const systemApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getHealth: builder.query({
            query: () => ({
                url: "/health",
                method: "GET",
            }),
        }),
    }),
});

export const {
    useGetHealthQuery,
} = systemApi;