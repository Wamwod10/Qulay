import { apiRequest, unwrapList } from "../../../services/api/apiClient";
import { savePurchases } from "./purchasesStorage";
import { saveWarehouseStock } from "../../warehouse/utils/warehouseStorage";

export const receivePurchaseIntoWarehouse = async ({
  purchase,
  receivedItems,
  receivedDate,
  idempotencyKey,
}) => {
  if (!purchase) {
    throw new Error("Xarid topilmadi.");
  }

  if (purchase.status === "RECEIVED" || purchase.status === "CANCELLED") {
    throw new Error("Bu xaridni qabul qilib bo'lmaydi.");
  }

  if (!Array.isArray(receivedItems) || !receivedItems.length) {
    throw new Error("Qabul qilinadigan mahsulotlarni kiriting.");
  }

  const receiveKey =
    idempotencyKey ||
    `purchase-receive:${purchase.id}:${Date.now()}:${receivedItems
      .map((item) => `${item.itemId || item.productId}:${item.quantity}:${item.unit || ""}`)
      .join(",")}`;

  const remotePurchase = await apiRequest(`/purchases/${purchase.id}/receive`, {
    method: "POST",
    idempotencyKey: receiveKey,
    body: {
      idempotencyKey: receiveKey,
      receivedDate,
      receivedItems: receivedItems.map((item) => ({
        purchaseItemId: item.itemId,
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit,
        batchNumber: item.batchNumber || null,
        expiryDate: item.expiryDate || null,
        productionDate: item.productionDate || null,
      })),
    },
  });

  if (!remotePurchase?.id) {
    throw new Error("Xarid qabul qilish backendda saqlanmadi.");
  }

  const purchasesResult = await apiRequest("/purchases");
  const purchases = unwrapList(purchasesResult, ["purchases"]);
  if (Array.isArray(purchases)) {
    savePurchases(purchases);
  }

  const stockResult = await apiRequest("/inventory/stock");
  const remoteStock = unwrapList(stockResult, ["stock"]);
  if (Array.isArray(remoteStock)) {
    saveWarehouseStock(remoteStock);
    window.dispatchEvent(new Event("warehouse:changed"));
  }

  return {
    purchase: remotePurchase,
    stock: Array.isArray(remoteStock) ? remoteStock : null,
  };
};
