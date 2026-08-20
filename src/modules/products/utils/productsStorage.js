import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import { apiRequest, getCachedApiResponse, primeApiCache, unwrapList } from "../../../services/api/apiClient";

const STORAGE_KEY = "products";
const HISTORY_KEY = "product_history";

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
  unit: product.unit || "dona",
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
  createdAt: product.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const summarizeProduct = (product) => {
  if (!product) {
    return null;
  }

  return {
    name: product.name,
    sku: product.sku,
    status: product.status,
    stock: product.stock,
    cost: product.cost,
    salePrice: product.salePrice,
  };
};

const createHistoryEvent = (data) => ({
  id: `history-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  date: new Date().toISOString(),
  ...data,
});

export const generateRandomSku = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

export const generateUniqueSku = (excludedProductId = null) => {
  const products = getStoredProducts();
  const usedSkus = new Set(
    products
      .filter((product) => product.id !== excludedProductId)
      .map((product) => String(product.sku || "").trim())
      .filter(Boolean),
  );

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const sku = generateRandomSku();

    if (!usedSkus.has(sku)) {
      return sku;
    }
  }

  let fallback = 1000;

  while (usedSkus.has(String(fallback)) && fallback <= 9999) {
    fallback += 1;
  }

  return String(Math.min(fallback, 9999));
};

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
} = {}) => {
  const params = new URLSearchParams({
    page: String(Math.max(Number(page) || 1, 1)),
    limit: String(Math.min(Math.max(Number(limit) || 20, 1), 500)),
  });

  if (search.trim()) params.set("search", search.trim());
  if (type) params.set("type", type);
  if (category) params.set("category", category);
  if (status) params.set("status", status);

  let remoteResult = null;
  try {
    remoteResult = await apiRequest(`/products?${params.toString()}`);
  } catch {
    return {
      products: getStoredProducts(),
      remote: false,
      meta: null,
    };
  }
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

export const getProductHistory = (productId) => {
  const history = readJson(HISTORY_KEY, {});

  if (!history || typeof history !== "object" || Array.isArray(history)) {
    writeJson(HISTORY_KEY, {});

    return [];
  }

  return Array.isArray(history[productId]) ? history[productId] : [];
};

export const addProductHistory = (productId, data) => {
  const history = readJson(HISTORY_KEY, {});
  const safeHistory =
    history && typeof history === "object" && !Array.isArray(history) ? history : {};

  const currentHistory = Array.isArray(safeHistory[productId])
    ? safeHistory[productId]
    : [];

  safeHistory[productId] = [createHistoryEvent(data), ...currentHistory];

  writeJson(HISTORY_KEY, safeHistory);

  return safeHistory[productId][0];
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
    primeApiCache("/products", { products: next, data: next });
    return normalizeProduct(remoteProduct);
  }

  const products = getStoredProducts();
  const normalizedProduct = normalizeProduct({
    ...product,
    sku:
      String(product.sku || "").trim() ||
      generateUniqueSku(product.id),
    createdAt: product.createdAt || new Date().toISOString(),
  });

  saveProducts([normalizedProduct, ...products]);

  addProductHistory(normalizedProduct.id, {
    type: "CREATE",
    title: "Mahsulot yaratildi",
    description: "Mahsulot katalogga qo'shildi.",
    newValue: normalizedProduct.name,
    after: summarizeProduct(normalizedProduct),
  });

  return normalizedProduct;
};

export const updateStoredProduct = async (updatedProduct) => {
  const remoteProduct = updatedProduct?.id
    ? await apiRequest(`/products/${updatedProduct.id}`, {
        method: "PATCH",
        body: updatedProduct,
      })
    : null;

  if (remoteProduct?.id) {
    const products = getStoredProducts();
    const nextProducts = products.map((product) =>
      product.id === remoteProduct.id ? remoteProduct : product,
    );
    saveProducts(nextProducts);
    primeApiCache("/products", { products: nextProducts, data: nextProducts });
    return normalizeProduct(remoteProduct);
  }

  const products = getStoredProducts();
  const existingProduct = products.find((product) => product.id === updatedProduct.id);

  if (!existingProduct) {
    return null;
  }

  const mergedProduct = normalizeProduct({
    ...existingProduct,
    ...updatedProduct,
    image:
      updatedProduct.image !== undefined
        ? updatedProduct.image
        : existingProduct.image || "",
    createdAt: existingProduct.createdAt,
  });

  saveProducts(
    products.map((product) =>
      product.id === mergedProduct.id ? mergedProduct : product,
    ),
  );

  addProductHistory(mergedProduct.id, {
    type: "UPDATE",
    title: "Mahsulot tahrirlandi",
    description: "Mahsulot ma'lumotlari yangilandi.",
    oldValue: existingProduct.name,
    newValue: mergedProduct.name,
    before: summarizeProduct(existingProduct),
    after: summarizeProduct(mergedProduct),
  });

  return mergedProduct;
};

export const deleteStoredProduct = async (productId) => {
  await apiRequest(`/products/${productId}`, {
    method: "DELETE",
  });

  const products = getStoredProducts();
  const product = products.find((item) => item.id === productId);

  saveProducts(products.filter((item) => item.id !== productId));

  return product || null;
};

export const toggleStoredProductStatus = async (productId) => {
  const products = getStoredProducts();
  let updatedProduct = null;
  let previousStatus = null;

  const updatedProducts = products.map((product) => {
    if (product.id !== productId || product.status === "ARCHIVED") {
      return product;
    }

    previousStatus = product.status;
    updatedProduct = normalizeProduct({
      ...product,
      status: product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      createdAt: product.createdAt,
    });

    return updatedProduct;
  });

  saveProducts(updatedProducts);

  if (updatedProduct) {
    await apiRequest(`/products/${productId}/status`, {
      method: "PATCH",
      body: { status: updatedProduct.status },
    });
  }

  if (updatedProduct) {
    addProductHistory(productId, {
      type: "STATUS",
      title: "Status o'zgartirildi",
      description:
        updatedProduct.status === "ACTIVE"
          ? "Mahsulot faollashtirildi."
          : "Mahsulot faol emas holatiga o'tkazildi.",
      oldValue: previousStatus,
      newValue: updatedProduct.status,
      before: { status: previousStatus },
      after: { status: updatedProduct.status },
    });
  }

  return updatedProduct;
};

export const duplicateStoredProduct = async (productId) => {
  const remoteProduct = await apiRequest(`/products/${productId}/duplicate`, {
    method: "POST",
    body: {},
  });

  if (remoteProduct?.id) {
    const products = getStoredProducts();
    saveProducts([remoteProduct, ...products.filter((item) => item.id !== remoteProduct.id)]);
    return normalizeProduct(remoteProduct);
  }

  const products = getStoredProducts();
  const product = products.find((item) => item.id === productId);

  if (!product) {
    return null;
  }

  const duplicatedProduct = normalizeProduct({
    ...product,
    id: `prd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: `${product.name} - nusxa`,
    sku: generateUniqueSku(),
    barcode: "",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  });

  saveProducts([duplicatedProduct, ...products]);

  addProductHistory(duplicatedProduct.id, {
    type: "DUPLICATE",
    title: "Mahsulot nusxalandi",
    description: `"${product.name}" mahsuloti asosida yangi mahsulot yaratildi.`,
    oldValue: product.name,
    newValue: duplicatedProduct.name,
    before: summarizeProduct(product),
    after: summarizeProduct(duplicatedProduct),
  });

  addProductHistory(product.id, {
    type: "DUPLICATE",
    title: "Mahsulotdan nusxa olindi",
    description: `"${duplicatedProduct.name}" nusxasi yaratildi.`,
    oldValue: product.name,
    newValue: duplicatedProduct.name,
  });

  return duplicatedProduct;
};

export const adjustStoredProductStock = async ({ productId, newStock, reason }) => {
  const remoteProduct = await apiRequest(`/products/${productId}/stock`, {
    method: "PATCH",
    body: { newStock, reason },
  });

  if (remoteProduct?.id) {
    const products = getStoredProducts();
    saveProducts(products.map((product) => (product.id === remoteProduct.id ? remoteProduct : product)));
    return normalizeProduct(remoteProduct);
  }

  const parsedStock = Number(newStock);

  if (!Number.isFinite(parsedStock) || parsedStock < 0) {
    return null;
  }

  const products = getStoredProducts();
  let updatedProduct = null;
  let previousStock = null;

  const updatedProducts = products.map((product) => {
    if (product.id !== productId) {
      return product;
    }

    previousStock = Number(product.stock) || 0;
    updatedProduct = normalizeProduct({
      ...product,
      stock: parsedStock,
      createdAt: product.createdAt,
    });

    return updatedProduct;
  });

  saveProducts(updatedProducts);

  if (updatedProduct) {
    addProductHistory(productId, {
      type: "STOCK_ADJUSTMENT",
      title: "Qoldiq tuzatildi",
      description: reason?.trim() || "Qoldiq qo'lda tuzatildi.",
      oldValue: previousStock,
      newValue: updatedProduct.stock,
      before: { stock: previousStock },
      after: { stock: updatedProduct.stock },
    });
  }

  return updatedProduct;
};

export const updateStoredProductPrices = async ({ productId, cost, salePrice, reason }) => {
  const remoteProduct = await apiRequest(`/products/${productId}/prices`, {
    method: "PATCH",
    body: { cost, salePrice, reason },
  });

  if (remoteProduct?.id) {
    const products = getStoredProducts();
    saveProducts(products.map((product) => (product.id === remoteProduct.id ? remoteProduct : product)));
    return normalizeProduct(remoteProduct);
  }

  const parsedCost = Number(cost);
  const parsedSalePrice =
    salePrice === "" || salePrice === null || salePrice === undefined
      ? null
      : Number(salePrice);

  if (
    !Number.isFinite(parsedCost) ||
    parsedCost < 0 ||
    (parsedSalePrice !== null && (!Number.isFinite(parsedSalePrice) || parsedSalePrice < 0))
  ) {
    return null;
  }

  const products = getStoredProducts();
  let updatedProduct = null;
  let oldCost = null;
  let oldSalePrice = null;

  const updatedProducts = products.map((product) => {
    if (product.id !== productId) {
      return product;
    }

    oldCost = product.cost;
    oldSalePrice = product.salePrice;
    updatedProduct = normalizeProduct({
      ...product,
      cost: parsedCost,
      salePrice: parsedSalePrice,
      createdAt: product.createdAt,
    });

    return updatedProduct;
  });

  saveProducts(updatedProducts);

  if (updatedProduct) {
    addProductHistory(productId, {
      type: "PRICE",
      title: "Narx o'zgartirildi",
      description: reason?.trim() || "Mahsulot narxlari yangilandi.",
      oldCost,
      newCost: updatedProduct.cost,
      oldSalePrice,
      newSalePrice: updatedProduct.salePrice,
      before: { cost: oldCost, salePrice: oldSalePrice },
      after: { cost: updatedProduct.cost, salePrice: updatedProduct.salePrice },
    });
  }

  return updatedProduct;
};

export const archiveStoredProduct = async (productId) => {
  const remoteProduct = await apiRequest(`/products/${productId}/status`, {
    method: "PATCH",
    body: { status: "ARCHIVED" },
  });

  if (remoteProduct?.id) {
    const products = getStoredProducts();
    saveProducts(products.map((product) => (product.id === remoteProduct.id ? remoteProduct : product)));
    return normalizeProduct(remoteProduct);
  }

  const products = getStoredProducts();
  let archivedProduct = null;
  let previousStatus = null;

  const updatedProducts = products.map((product) => {
    if (product.id !== productId) {
      return product;
    }

    previousStatus = product.status;
    archivedProduct = normalizeProduct({
      ...product,
      status: "ARCHIVED",
      createdAt: product.createdAt,
    });

    return archivedProduct;
  });

  saveProducts(updatedProducts);

  if (archivedProduct) {
    addProductHistory(productId, {
      type: "ARCHIVE",
      title: "Mahsulot arxivlandi",
      description: "Mahsulot arxivga o'tkazildi.",
      oldValue: previousStatus,
      newValue: "ARCHIVED",
      before: { status: previousStatus },
      after: { status: "ARCHIVED" },
    });
  }

  return archivedProduct;
};

export const restoreStoredProduct = async (productId) => {
  const remoteProduct = await apiRequest(`/products/${productId}/status`, {
    method: "PATCH",
    body: { status: "ACTIVE" },
  });

  if (remoteProduct?.id) {
    const products = getStoredProducts();
    saveProducts(products.map((product) => (product.id === remoteProduct.id ? remoteProduct : product)));
    return normalizeProduct(remoteProduct);
  }

  const products = getStoredProducts();
  let restoredProduct = null;

  const updatedProducts = products.map((product) => {
    if (product.id !== productId) {
      return product;
    }

    restoredProduct = normalizeProduct({
      ...product,
      status: "ACTIVE",
      createdAt: product.createdAt,
    });

    return restoredProduct;
  });

  saveProducts(updatedProducts);

  if (restoredProduct) {
    addProductHistory(productId, {
      type: "RESTORE",
      title: "Mahsulot arxivdan qaytarildi",
      description: "Mahsulot faol holatga qaytarildi.",
      oldValue: "ARCHIVED",
      newValue: "ACTIVE",
      before: { status: "ARCHIVED" },
      after: { status: "ACTIVE" },
    });
  }

  return restoredProduct;
};
