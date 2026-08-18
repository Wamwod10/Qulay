import { API_ORIGIN } from "../../../services/api/apiUrl";

const getToken = () => {
    let session = null;

    try {
        session =
            JSON.parse(localStorage.getItem("erp:auth:session") || "null") ||
            JSON.parse(sessionStorage.getItem("erp:auth:session:temporary") || "null");
    } catch {
        session = null;
    }

    return (
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        session?.accessToken ||
        ""
    );
};

const request = async (
    path,
    options = {},
) => {
    const token = getToken();

    const response = await fetch(
        `${API_ORIGIN}${path}`,
        {
            ...options,

            headers: {
                "Content-Type":
                    "application/json",

                ...(token
                    ? {
                        Authorization:
                            `Bearer ${token}`,
                    }
                    : {}),

                ...(options.headers ||
                    {}),
            },
        },
    );

    if (!response.ok) {
        let message =
            "Server xatosi";

        try {
            const data =
                await response.json();

            message =
                data.message ||
                data.error ||
                message;
        } catch {
            // ignore
        }

        throw new Error(message);
    }

    if (
        response.status === 204
    ) {
        return null;
    }

    return response.json();
};

export const getSuperAdminUsers =
    async (params = {}) => {
        const search = new URLSearchParams(
            Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
        ).toString();
        const data = await request(
            `/api/superadmin/users${search ? `?${search}` : ""}`,
        );

        return Array.isArray(data)
            ? data
            : data.users || [];
    };

export const updateSuperAdminUserStatus =
    async (
        userId,
        status,
    ) => {
        return request(
            `/api/superadmin/users/${userId}/status`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    status,
                }),
            },
        );
    };

export const deleteSuperAdminUser =
    async (userId) => {
        return request(
            `/api/superadmin/users/${userId}`,
            {
                method: "DELETE",
            },
        );
    };

export const getSuperAdminUser =
    async (userId) => {
        return request(
            `/api/superadmin/users/${userId}`,
        );
    };

export const getSuperAdminUserModules =
    async (accountId) => {
        return request(
            `/api/superadmin/accounts/${accountId}/modules`,
        );
    };

export const updateSuperAdminUserModule =
    async (
        accountId,
        moduleKey,
        enabled,
    ) => {
        return request(
            `/api/superadmin/accounts/${accountId}/modules/${moduleKey}`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    enabled,
                }),
            },
        );
    };

export const getGlobalModules =
    async () => {
        return request(
            "/api/superadmin/modules",
        );
    };

export const updateGlobalModule =
    async (
        moduleKey,
        enabled,
    ) => {
        return request(
            `/api/superadmin/modules/${moduleKey}`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    enabled,
                }),
            },
        );
    };

export const getGlobalModuleAccess =
    async () => {
        return request(
            "/api/superadmin/modules",
        );
    };

export const getAccountModuleAccess =
    async (accountId) => {
        if (!accountId) {
            return {};
        }

        return request(
            `/api/superadmin/accounts/${accountId}/modules`,
        );
    };

export const getSuperAdminDashboard =
    async () => request(
        "/api/superadmin/dashboard",
    );

export const getSuperAdminCompanies =
    async (params = {}) => {
        const search = new URLSearchParams(
            Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
        ).toString();

        const data = await request(
            `/api/superadmin/companies${search ? `?${search}` : ""}`,
        );

        return Array.isArray(data)
            ? data
            : data.companies || [];
    };

export const getSuperAdminCompany =
    async (companyId) => request(
        `/api/superadmin/companies/${companyId}`,
    );

export const updateSuperAdminCompanyStatus =
    async (companyId, status) => request(
        `/api/superadmin/companies/${companyId}/status`,
        {
            method: "PATCH",
            body: JSON.stringify({ status }),
        },
    );

export const getSuperAdminAuditLogs =
    async (params = {}) => {
        const search = new URLSearchParams(
            Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
        ).toString();

        return request(
            `/api/superadmin/audit-logs${search ? `?${search}` : ""}`,
        );
    };
