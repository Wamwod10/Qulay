import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import {
  apiRequest,
  getCachedApiResponse,
  invalidateApiCache,
  unwrapList,
} from "../../../services/api/apiClient";

const STORAGE_KEY = "products";

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

const readJson = (key, fallback) => {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    return tenantGet(key, fallback);
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!canUseStorage()) {
    return false;
  }

  try {
    tenantSet(key, value);

    return true;
  } catch {
    return false;
  }
};

const normalizeProduct = (product) => ({
  id: product.id || `prd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  name: product.name || "Nomsiz mahsulot",
  sku: product.sku || generateRandomSku(),
  barcode: product.barcode || "",
  type: product.type || "",
  category:
    product.category && String(product.category).includes("shimchalar")
      ? "Qo'shimchalar"
      : product.category || "",
  brand: product.brand || "",
  unit: product.unit || "",
  parentProductId: product.parentProductId || null,
  packSize:
    product.packSize === "" || product.packSize === null || product.packSize === undefined
      ? null
      : Number(product.packSize),
  packUnit: product.packUnit || "",
  isVariant: Boolean(product.isVariant),
  warehouseId:
    product.warehouseId ||
    product.stockItems?.find((item) => Number(item.quantity || 0) > 0)?.warehouseId ||
    product.stockItems?.[0]?.warehouseId ||
    "",
  stock: Number(product.stock) || 0,
  minimumStock: Number(product.minimumStock) || 0,
  cost: Number(product.cost) || 0,
  salePrice:
    product.salePrice === "" || product.salePrice === null || product.salePrice === undefined
      ? null
      : Number(product.salePrice),
  supplierId: product.supplierId || null,
  supplierName: product.supplierName || null,
  tax: Number(product.tax) || 0,
  discount: Number(product.discount) || 0,
  image: product.image || "",
  notes: product.notes || "",
  status: product.status || "ACTIVE",
  stockItems: Array.isArray(product.stockItems) ? product.stockItems : [],
  batches: Array.isArray(product.batches) ? product.batches : [],
  history: Array.isArray(product.history) ? product.history : [],
  createdAt: product.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const generateRandomSku = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

export const getStoredProducts = () => {
  const remoteProducts = unwrapList(getCachedApiResponse("/products"), ["products"]);

  if (Array.isArray(remoteProducts)) {
    writeJson(STORAGE_KEY, remoteProducts);
    return remoteProducts.map(normalizeProduct);
  }

  const storedProducts = readJson(STORAGE_KEY, null);

  if (!Array.isArray(storedProducts)) {
    writeJson(STORAGE_KEY, []);

    return [];
  }

  return storedProducts.map(normalizeProduct);
};

export const getStoredProductsPage = async ({
  page = 1,
  limit = 20,
  search = "",
  type = "",
  category = "",
  status = "ACTIVE,INACTIVE",
  skipCache = false,
} = {}) => {
  const params = new URLSearchParams({
    page: String(Math.max(Number(page) || 1, 1)),
    limit: String(Math.min(Math.max(Number(limit) || 20, 1), 500)),
  });

  if (search.trim()) params.set("search", search.trim());
  if (type) params.set("type", type);
  if (category) params.set("category", category);
  if (status) params.set("status", status);

  const remoteResult = await apiRequest(`/products?${params.toString()}`, { skipCache });
  const remoteProducts = unwrapList(remoteResult, ["products"]);

  if (Array.isArray(remoteProducts)) {
    const normalized = remoteProducts.map(normalizeProduct);
    const stored = readJson(STORAGE_KEY, []);
    const merged = [
      ...normalized,
      ...(Array.isArray(stored) ? stored : []).filter(
        (storedProduct) => !normalized.some((product) => product.id === storedProduct.id),
      ),
    ];
    writeJson(STORAGE_KEY, merged);

    return {
      products: normalized,
      remote: true,
      meta: remoteResult?.meta || {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        total: normalized.length,
        totalPages: 1,
      },
    };
  }

  return {
    products: getStoredProducts(),
    remote: false,
    meta: null,
  };
};

export const saveProducts = (products) => {
  if (!Array.isArray(products)) {
    return false;
  }

  const saved = writeJson(STORAGE_KEY, products.map(normalizeProduct));

  if (saved && typeof window !== "undefined") {
    window.dispatchEvent(new Event("products:changed"));
  }

  return saved;
};

export const getStoredProductById = (productId) =>
  getStoredProducts().find((product) => product.id === productId) || null;

export const fetchStoredProductById = async (productId) => {
  const remoteProduct = await apiRequest(`/products/${productId}`);

  if (!remoteProduct?.id) {
    throw new Error("Mahsulot topilmadi.");
  }

  const normalized = normalizeProduct(remoteProduct);
  const products = getStoredProducts();
  saveProducts([
    normalized,
    ...products.filter((product) => product.id !== normalized.id),
  ]);

  return normalized;
};

export const createStoredProduct = async (product, options = {}) => {
  const remoteProduct = await apiRequest("/products", {
    method: "POST",
    body: product,
    inlineModule: options.inlineModule,
  });

  if (remoteProduct?.id) {
    const products = getStoredProducts();
    const next = [remoteProduct, ...products.filter((item) => item.id !== remoteProduct.id)];
    saveProducts(next);
    invalidateApiCache();
    return normalizeProduct(remoteProduct);
  }
  throw new Error("Mahsulot backendda saqlanmadi.");
};

export const updateStoredProduct = async (updatedProduct) => {
  const products = getStoredProducts();
  const remoteProduct = updatedProduct?.id
    ? await apiRequest(`/products/${updatedProduct.id}`, {
        method: "PATCH",
        body: updatedProduct,
      })
    : null;

  if (remoteProduct?.id) {
    const exists = products.some((product) => product.id === remoteProduct.id);
    const nextProducts = exists
      ? products.map((product) => product.id === remoteProduct.id ? remoteProduct : product)
      : [remoteProduct, ...products];
    saveProducts(nextProducts);
    invalidateApiCache();
    return normalizeProduct(remoteProduct);
  }

  throw new Error("Mahsulot backendda yangilanmadi.");
};

export const deleteStoredProduct = async (productId) => {
  await apiRequest(`/products/${productId}`, {
    method: "DELETE",
  });

  const products = getStoredProducts();
  const product = products.find((item) => item.id === productId);

  saveProducts(products.filter((item) => item.id !== productId));
  invalidateApiCache();

  return product || null;
};

export const toggleStoredProductStatus = async (productId) => {
  const products = getStoredProducts();
  let updatedProduct = null;

  products.forEach((product) => {
    if (product.id !== productId || product.status === "ARCHIVED") {
      return;
    }

    updatedProduct = normalizeProduct({
      ...product,
      status: product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      createdAt: product.createdAt,
    });
  });

  if (updatedProduct) {
    const remoteProduct = await apiRequest(`/products/${productId}/status`, {
      method: "PATCH",
      body: { status: updatedProduct.status },
    });

    const nextProducts = products.map((product) =>
      product.id === remoteProduct.id ? remoteProduct : product,
    );
    saveProducts(nextProducts);
    invalidateApiCache();
    return normalizeProduct(remoteProduct);
  }

  return null;
};

export const duplicateStoredProduct = async (productId) => {
  const remoteProduct = await apiRequest(`/products/${productId}/duplicate`, {
    method: "POST",
    body: {},
  });

  if (remoteProduct?.id) {
    const products = getStoredProducts();
    saveProducts([remoteProduct, ...products.filter((item) => item.id !== remoteProduct.id)]);
    invalidateApiCache();
    return normalizeProduct(remoteProduct);
  }
  throw new Error("Mahsulot nusxasi backendda saqlanmadi.");
};

export const adjustStoredProductStock = async ({ productId, warehouseId, newStock, reason, cost }) => {
  const remoteProduct = await apiRequest(`/products/${productId}/stock`, {
    method: "PATCH",
    body: { warehouseId, newStock, reason, cost },
  });

  if (remoteProduct?.id) {
    const products = getStoredProducts();
    saveProducts(products.map((product) => (product.id === remoteProduct.id ? remoteProduct : product)));
    invalidateApiCache();
    return normalizeProduct(remoteProduct);
  }
  throw new Error("Qoldiq backendda yangilanmadi.");
};

export const updateStoredProductPrices = async ({ productId, cost, salePrice, reason }) => {
  const remoteProduct = await apiRequest(`/products/${productId}/prices`, {
    method: "PATCH",
    body: { cost, salePrice, reason },
  });

  if (remoteProduct?.id) {
    const products = getStoredProducts();
    saveProducts(products.map((product) => (product.id === remoteProduct.id ? remoteProduct : product)));
    invalidateApiCache();
    return normalizeProduct(remoteProduct);
  }
  throw new Error("Narx backendda yangilanmadi.");
};

export const archiveStoredProduct = async (productId) => {
  const remoteProduct = await apiRequest(`/products/${productId}/status`, {
    method: "PATCH",
    body: { status: "ARCHIVED" },
  });

  if (remoteProduct?.id) {
    const products = getStoredProducts();
    saveProducts(products.map((product) => (product.id === remoteProduct.id ? remoteProduct : product)));
    invalidateApiCache();
    return normalizeProduct(remoteProduct);
  }
  throw new Error("Mahsulot backendda arxivlanmadi.");
};

export const restoreStoredProduct = async (productId) => {
  const remoteProduct = await apiRequest(`/products/${productId}/status`, {
    method: "PATCH",
    body: { status: "ACTIVE" },
  });

  if (remoteProduct?.id) {
    const products = getStoredProducts();
    saveProducts(products.map((product) => (product.id === remoteProduct.id ? remoteProduct : product)));
    invalidateApiCache();
    return normalizeProduct(remoteProduct);
  }
  throw new Error("Mahsulot backendda tiklanmadi.");
};
