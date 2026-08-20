import { translateText } from "../../../../localization/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Boxes, CircleAlert, Package, PackageCheck, Plus } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  LiveIcon,
  Pagination,
  Select,
  TableToolbar } from
"../../../../shared/ui";

import BarcodeQrModal from "../../components/BarcodeQrModal/BarcodeQrModal";
import PriceChangeModal from "../../components/PriceChangeModal/PriceChangeModal";
import ProductTable from "../../components/ProductTable/ProductTable";
import StockAdjustmentModal from "../../components/StockAdjustmentModal/StockAdjustmentModal";

import { PRODUCT_CATEGORIES } from "../../constants/productCategories";
import { PRODUCT_TYPES } from "../../constants/productTypes";

import {
  adjustStoredProductStock,
  archiveStoredProduct,
  deleteStoredProduct,
  duplicateStoredProduct,
  getStoredProducts,
  getStoredProductsPage,
  restoreStoredProduct,
  toggleStoredProductStatus,
  updateStoredProductPrices } from
"../../utils/productsStorage";

import { getStockStatus } from "../../utils/productHelpers";
import {
  useTableSettings,
  useTerminology } from
"../../../settings/selectors/settingsSelectors";
import { updateTableSettings } from "../../../../store/slices/settingsSlice";

import "./ProductsPage.scss";

const PAGE_SIZE = 10;
const MIN_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 500;

const ProductsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tTerm } = useTerminology();
  const productTableSettings = useTableSettings("products");
  const pageSize = Math.min(
    Math.max(Number(productTableSettings.defaultPageSize) || PAGE_SIZE, MIN_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );

  const [products, setProducts] = useState(() => getStoredProducts());
  const [statsProducts, setStatsProducts] = useState(products);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSizeInput, setPageSizeInput] = useState(String(pageSize));
  const [pageSizeError, setPageSizeError] = useState("");
  const [remoteMeta, setRemoteMeta] = useState(null);

  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [priceProduct, setPriceProduct] = useState(null);
  const [archiveProduct, setArchiveProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);

  const refreshProducts = useCallback(async () => {
    const usesLocalStockFilter = Boolean(stockFilter);
    const result = await getStoredProductsPage({
      page: usesLocalStockFilter ? 1 : page,
      limit: usesLocalStockFilter ? MAX_PAGE_SIZE : pageSize,
      search,
      type: typeFilter,
      category: categoryFilter,
      status: statusFilter || "ACTIVE,INACTIVE",
    });

    setProducts(result.products);
    setRemoteMeta(result.remote && !usesLocalStockFilter ? result.meta : null);
    setStatsProducts((current) => {
      if (!result.remote) return result.products;
      const merged = [...result.products, ...current.filter((item) => !result.products.some((product) => product.id === item.id))];
      return merged;
    });
  }, [categoryFilter, page, pageSize, search, statusFilter, stockFilter, typeFilter]);

  useEffect(() => {
    void refreshProducts();
  }, [refreshProducts]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const productName = product.name?.toLowerCase() || "";
      const productSku = product.sku?.toLowerCase() || "";
      const productBarcode = product.barcode?.toLowerCase() || "";

      const matchesSearch =
      !normalizedSearch ||
      productName.includes(normalizedSearch) ||
      productSku.includes(normalizedSearch) ||
      productBarcode.includes(normalizedSearch);

      const matchesType = !typeFilter || product.type === typeFilter;
      const matchesCategory = !categoryFilter || product.category === categoryFilter;
      const matchesStock = !stockFilter || getStockStatus(product) === stockFilter;

      const matchesStatus = statusFilter ?
      product.status === statusFilter :
      product.status !== "ARCHIVED";

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesStatus &&
        matchesStock);

    });
  }, [products, search, typeFilter, categoryFilter, statusFilter, stockFilter]);

  const usesRemotePagination = Boolean(remoteMeta) && !stockFilter;
  const totalPages = usesRemotePagination
    ? Math.max(1, Number(remoteMeta.totalPages) || 1)
    : Math.max(1, Math.ceil(filteredProducts.length / pageSize));

  const paginatedProducts = useMemo(() => {
    if (usesRemotePagination) return filteredProducts;

    const startIndex = (page - 1) * pageSize;

    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, page, pageSize, usesRemotePagination]);

  const stats = useMemo(() => {
    const visibleProducts = statsProducts.filter((product) => product.status !== "ARCHIVED");

    return {
      total: visibleProducts.length,
      active: visibleProducts.filter((product) => product.status === "ACTIVE").length,
      lowStock: visibleProducts.filter(
        (product) => getStockStatus(product) === "LOW_STOCK"
      ).length,
      outOfStock: visibleProducts.filter(
        (product) => getStockStatus(product) === "OUT_OF_STOCK"
      ).length
    };
  }, [statsProducts]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, categoryFilter, statusFilter, stockFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPageSizeInput(String(pageSize));
  }, [pageSize]);

  const applyPageSize = () => {
    const parsed = Number(pageSizeInput);
    if (!Number.isInteger(parsed) || parsed < MIN_PAGE_SIZE || parsed > MAX_PAGE_SIZE) {
      setPageSizeError(`${MIN_PAGE_SIZE} dan ${MAX_PAGE_SIZE} gacha butun son kiriting.`);
      return;
    }

    dispatch(updateTableSettings({
      tableId: "products",
      changes: { defaultPageSize: parsed },
    }));
    setPage(1);
    setPageSizeError("");
  };

  const hasActiveFilters = Boolean(
    search || typeFilter || categoryFilter || statusFilter || stockFilter
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setTypeFilter("");
    setCategoryFilter("");
    setStatusFilter("");
    setStockFilter("");
  }, []);

  const handleToggleStatus = useCallback(async (product) => {
    await toggleStoredProductStatus(product.id);
    await refreshProducts();
  }, [refreshProducts]);

  const handleDuplicate = useCallback(async (product) => {
    const duplicatedProduct = await duplicateStoredProduct(product.id);

    await refreshProducts();

    if (duplicatedProduct) {
      navigate(`/products/${duplicatedProduct.id}/edit`);
    }
  }, [navigate, refreshProducts]);

  const handleStockAdjustment = useCallback(async (values) => {
    const updatedProduct = await adjustStoredProductStock(values);

    if (updatedProduct) {
      setStockProduct(null);
      await refreshProducts();
    }
  }, [refreshProducts]);

  const handlePriceChange = useCallback(async (values) => {
    const updatedProduct = await updateStoredProductPrices(values);

    if (updatedProduct) {
      setPriceProduct(null);
      await refreshProducts();
    }
  }, [refreshProducts]);

  const handleArchiveOrRestore = useCallback(async () => {
    if (!archiveProduct) {
      return;
    }

    if (archiveProduct.status === "ARCHIVED") {
      await restoreStoredProduct(archiveProduct.id);
    } else {
      await archiveStoredProduct(archiveProduct.id);
    }

    setArchiveProduct(null);
    await refreshProducts();
  }, [archiveProduct, refreshProducts]);

  const handleDelete = useCallback(async () => {
    if (!deleteProduct) {
      return;
    }

    await deleteStoredProduct(deleteProduct.id);
    setDeleteProduct(null);
    await refreshProducts();
  }, [deleteProduct, refreshProducts]);

  const handleView = useCallback((product) => navigate(`/products/${product.id}`), [navigate]);
  const handleEdit = useCallback((product) => navigate(`/products/${product.id}/edit`), [navigate]);
  const handleBarcode = useCallback((product) => setBarcodeProduct(product), []);
  const handleStockProduct = useCallback((product) => setStockProduct(product), []);
  const handlePriceProduct = useCallback((product) => setPriceProduct(product), []);
  const handleArchiveProduct = useCallback((product) => setArchiveProduct(product), []);
  const handleDeleteProduct = useCallback((product) => setDeleteProduct(product), []);

  const archiveDialogIsRestore = archiveProduct?.status === "ARCHIVED";

  return (
    <PageContainer
      title={tTerm("products")}
      description={translateText("Xomashyo, yarim tayyor, tayyor va savdo mahsulotlarini boshqarish.")}>
      
      <div className="products-page">
        <section className="products-page__stats">
          <Card variant="soft" padding="md" className="products-page__stat-card">
            <div className="products-page__stat-icon">
              <Package size={21} strokeWidth={1.8} />
            </div>

            <div>
              <span>{translateText("Jami")}{tTerm("product").toLowerCase()}</span>
              <strong>{stats.total}</strong>
            </div>
          </Card>

          <Card variant="soft" padding="md" className="products-page__stat-card">
            <div className="products-page__stat-icon products-page__stat-icon--success">
              <PackageCheck size={21} strokeWidth={1.8} />
            </div>

            <div>
              <span>{translateText("Faol")}</span>
              <strong>{stats.active}</strong>
            </div>
          </Card>

          <Card variant="soft" padding="md" className="products-page__stat-card">
            <div className="products-page__stat-icon products-page__stat-icon--warning">
              <LiveIcon
                icon={CircleAlert}
                motion="warning-glow"
                active={stats.lowStock > 0}
                size={21}
                strokeWidth={1.8} />
              
            </div>

            <div>
              <span>{translateText("Kam qolgan")}</span>
              <strong>{stats.lowStock}</strong>
            </div>
          </Card>

          <Card variant="soft" padding="md" className="products-page__stat-card">
            <div className="products-page__stat-icon products-page__stat-icon--danger">
              <LiveIcon
                icon={Boxes}
                motion="danger-breathe"
                active={stats.outOfStock > 0}
                size={21}
                strokeWidth={1.8} />
              
            </div>

            <div>
              <span>{translateText("Tugagan")}</span>
              <strong>{stats.outOfStock}</strong>
            </div>
          </Card>
        </section>

        <Card padding="md" className="products-page__workspace">
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={translateText("Nomi, SKU yoki shtrix-kod bo'yicha qidirish...")}
            actionLabel={`${translateText("Yangi")} ${tTerm("product").toLowerCase()}`}
            actionIcon={<Plus size={17} strokeWidth={1.9} />}
            onAction={() => navigate("/products/create")} />
          

          <div className="products-page__filters">
            <div className="products-page__filter">
              <Select
                value={typeFilter}
                placeholder={translateText("Barcha turlar")}
                options={PRODUCT_TYPES}
                onChange={(event) => setTypeFilter(event.target.value)} />
              
            </div>

            <div className="products-page__filter">
              <Select
                value={categoryFilter}
                placeholder={translateText("Barcha kategoriyalar")}
                options={PRODUCT_CATEGORIES}
                onChange={(event) => setCategoryFilter(event.target.value)} />
              
            </div>

            <div className="products-page__filter">
              <Select
                value={stockFilter}
                placeholder={translateText("Barcha qoldiq")}
                options={[
                { value: "IN_STOCK", label: translateText("Yetarli") },
                { value: "LOW_STOCK", label: translateText("Kam qolgan") },
                { value: "OUT_OF_STOCK", label: translateText("Tugagan") }]
                }
                onChange={(event) => setStockFilter(event.target.value)} />
              
            </div>

            <div className="products-page__filter">
              <Select
                value={statusFilter}
                placeholder={translateText("Barcha holatlar")}
                options={[
                { value: "ACTIVE", label: translateText("Faol") },
                { value: "INACTIVE", label: translateText("Faol emas") },
                { value: "ARCHIVED", label: translateText("Arxiv") }]
                }
                onChange={(event) => setStatusFilter(event.target.value)} />
              
            </div>

            {hasActiveFilters &&
            <Button variant="ghost" onClick={handleClearFilters}>{translateText("Filtrlarni tozalash")}

            </Button>
            }
          </div>

          <div className="products-page__result-info">
            <span>
              {remoteMeta?.total ?? filteredProducts.length} {translateText("ta mahsulot")}
              {statusFilter ? "" : ` (${translateText("arxivsiz")})`}
            </span>
          </div>

          <div className="products-page__page-size">
            <Input
              label={translateText("Sahifada")}
              type="number"
              min={MIN_PAGE_SIZE}
              max={MAX_PAGE_SIZE}
              step="1"
              value={pageSizeInput}
              error={pageSizeError}
              onChange={(event) => {
                setPageSizeInput(event.target.value);
                setPageSizeError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyPageSize();
                }
              }}
            />
            <Button type="button" variant="secondary" size="sm" onClick={applyPageSize}>
              {translateText("Qo'llash")}
            </Button>
          </div>

          <ProductTable
            products={paginatedProducts}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            onView={handleView}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
            onDuplicate={handleDuplicate}
            onBarcode={handleBarcode}
            onStockAdjustment={handleStockProduct}
            onPriceChange={handlePriceProduct}
            onArchive={handleArchiveProduct}
            onDelete={handleDeleteProduct} />
          

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </Card>
      </div>

      <BarcodeQrModal
        product={barcodeProduct}
        open={Boolean(barcodeProduct)}
        onClose={() => setBarcodeProduct(null)} />
      

      <StockAdjustmentModal
        product={stockProduct}
        open={Boolean(stockProduct)}
        onClose={() => setStockProduct(null)}
        onSubmit={handleStockAdjustment} />
      

      <PriceChangeModal
        product={priceProduct}
        open={Boolean(priceProduct)}
        onClose={() => setPriceProduct(null)}
        onSubmit={handlePriceChange} />
      

      <ConfirmDialog
        open={Boolean(archiveProduct)}
        title={translateText(
        archiveDialogIsRestore ? "Arxivdan qaytarish" : "Arxivga o'tkazish"
        )}
        description={
        archiveProduct ?
        `"${archiveProduct.name}" ${translateText("mahsuloti")} ${
        archiveDialogIsRestore ?
        translateText("faol holatga qaytariladi.") :
        translateText("arxivga o'tkaziladi.")}` :

        ""
        }
        confirmText={translateText(archiveDialogIsRestore ? "Qaytarish" : "Arxivlash")}
        onClose={() => setArchiveProduct(null)}
        onConfirm={handleArchiveOrRestore} />
      

      <ConfirmDialog
        open={Boolean(deleteProduct)}
        title={translateText("Mahsulotni o'chirish")}
        description={
        deleteProduct ?
        `"${deleteProduct.name}" ${translateText("butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.")}` :
        ""
        }
        confirmText={translateText("O'chirish")}
        danger
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete} />
      
    </PageContainer>);

};

export default ProductsPage;
