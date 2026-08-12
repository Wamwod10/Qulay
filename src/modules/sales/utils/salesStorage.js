import {
    INITIAL_SALES,
} from "../constants/salesMock";

import {
    calculateSaleTotals,
} from "./salesCalculations";

import {
    getPaymentStatus,
} from "./salesHelpers";

const STORAGE_KEY =
    "universal_erp_sales";

const normalizeSale = (
    sale,
) => {
    const totals =
        calculateSaleTotals({
            items:
                sale.items || [],

            discountType:
                sale.discountType,

            discountValue:
                sale.discountValue,

            paidAmount:
                sale.paidAmount,
        });

    return {
        id:
            sale.id || "",

        number:
            sale.number || "",

        customerId:
            sale.customerId || null,

        customerName:
            sale.customerName || "",

        agentId:
            sale.agentId || null,

        agentName:
            sale.agentName || "",

        warehouseId:
            sale.warehouseId || null,

        warehouseName:
            sale.warehouseName || "",

        items:
            Array.isArray(
                sale.items,
            )
                ? sale.items
                : [],

        discountType:
            sale.discountType ||
            "AMOUNT",

        discountValue:
            Number(
                sale.discountValue ||
                0,
            ),

        subtotal:
            totals.subtotal,

        discount:
            totals.discount,

        total:
            totals.total,

        paidAmount:
            totals.paidAmount,

        debtAmount:
            totals.debtAmount,

        paymentStatus:
            getPaymentStatus({
                total:
                    totals.total,

                paidAmount:
                    totals.paidAmount,
            }),

        status:
            sale.status ||
            "DRAFT",

        orderDate:
            sale.orderDate || "",

        note:
            sale.note || "",

        createdAt:
            sale.createdAt || null,

        updatedAt:
            sale.updatedAt || null,

        completedAt:
            sale.completedAt || null,

        cancelledAt:
            sale.cancelledAt || null,
    };
};

export const getStoredSales =
    () => {
        try {
            const stored =
                localStorage.getItem(
                    STORAGE_KEY,
                );

            if (!stored) {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(
                        INITIAL_SALES,
                    ),
                );

                return INITIAL_SALES;
            }

            const parsed =
                JSON.parse(stored);

            if (
                !Array.isArray(parsed)
            ) {
                return [];
            }

            return parsed.map(
                normalizeSale,
            );
        } catch (error) {
            console.error(
                "Sales storage error:",
                error,
            );

            return [];
        }
    };

export const saveSales = (
    sales,
) => {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            sales.map(
                normalizeSale,
            ),
        ),
    );
};

export const getSaleById = (
    saleId,
) => {
    return getStoredSales().find(
        (sale) =>
            sale.id === saleId,
    );
};

export const createSale = (
    values,
) => {
    const sales =
        getStoredSales();

    const now =
        new Date();

    const sale =
        normalizeSale({
            ...values,

            id:
                `sale-${Date.now()}`,

            number:
                `SO-${Math.floor(
                    1000 +
                    Math.random() *
                    9000,
                )}`,

            status:
                values.status ||
                "DRAFT",

            createdAt:
                now.toLocaleString(
                    "uz-UZ",
                ),

            updatedAt:
                now.toLocaleString(
                    "uz-UZ",
                ),
        });

    saveSales([
        sale,
        ...sales,
    ]);

    return sale;
};

export const updateSale = (
    updatedSale,
) => {
    const sales =
        getStoredSales();

    let result = null;

    const next =
        sales.map((sale) => {
            if (
                sale.id !==
                updatedSale.id
            ) {
                return sale;
            }

            result =
                normalizeSale({
                    ...sale,
                    ...updatedSale,

                    updatedAt:
                        new Date().toLocaleString(
                            "uz-UZ",
                        ),
                });

            return result;
        });

    saveSales(next);

    return result;
};