import { translateText } from "../../../../localization/i18n";import { useEffect, useMemo, useState } from "react";

import { Boxes, CircleAlert, Package, PackageCheck, Plus } from "lucide-react";

import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import {
  Button,
  Card,
  ConfirmDialog,
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
  restoreStoredProduct,
  toggleStoredProductStatus,
  updateStoredProductPrices } from
"../../utils/productsStorage";

import { getStockStatus } from "../../utils/productHelpers";
import {
  useTableSettings,
  useTerminology } from
"../../../settings/selectors/settingsSelectors";

import "./ProductsPage.scss";

const PAGE_SIZE = 10;

const ProductsPage = () => {
  const navigate = useNavigate();
  const { tTerm } = useTerminology();
  const productTableSettings = useTableSettings("products");
  const pageSize = productTableSettings.defaultPageSize || PAGE_SIZE;

  const [products, setProducts] = useState(() => getStoredProducts());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [page, setPage] = useState(1);

  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [priceProduct, setPriceProduct] = useState(null);
  const [archiveProduct, setArchiveProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);

  const refreshProducts = () => {
    setProducts(getStoredProducts());
  };

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

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

  const paginatedProducts = useMemo(() => {
    const startIndex = (page - 1) * pageSize;

    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, page, pageSize]);

  const stats = useMemo(() => {
    const visibleProducts = products.filter((product) => product.status !== "ARCHIVED");

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
  }, [products]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, categoryFilter, statusFilter, stockFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const hasActiveFilters = Boolean(
    search || typeFilter || categoryFilter || statusFilter || stockFilter
  );

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setCategoryFilter("");
    setStatusFilter("");
    setStockFilter("");
  };

  const handleToggleStatus = async (product) => {
    await toggleStoredProductStatus(product.id);
    refreshProducts();
  };

  const handleDuplicate = async (product) => {
    const duplicatedProduct = await duplicateStoredProduct(product.id);

    refreshProducts();

    if (duplicatedProduct) {
      navigate(`/products/${duplicatedProduct.id}/edit`);
    }
  };

  const handleStockAdjustment = async (values) => {
    const updatedProduct = await adjustStoredProductStock(values);

    if (updatedProduct) {
      setStockProduct(null);
      refreshProducts();
    }
  };

  const handlePriceChange = async (values) => {
    const updatedProduct = await updateStoredProductPrices(values);

    if (updatedProduct) {
      setPriceProduct(null);
      refreshProducts();
    }
  };

  const handleArchiveOrRestore = async () => {
    if (!archiveProduct) {
      return;
    }

    if (archiveProduct.status === "ARCHIVED") {
      await restoreStoredProduct(archiveProduct.id);
    } else {
      await archiveStoredProduct(archiveProduct.id);
    }

    setArchiveProduct(null);
    refreshProducts();
  };

  const handleDelete = async () => {
    if (!deleteProduct) {
      return;
    }

    await deleteStoredProduct(deleteProduct.id);
    setDeleteProduct(null);
    refreshProducts();
  };

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
              {filteredProducts.length} {translateText("ta mahsulot")}
              {statusFilter ? "" : ` (${translateText("arxivsiz")})`}
            </span>
          </div>

          <ProductTable
            products={paginatedProducts}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            onView={(product) => navigate(`/products/${product.id}`)}
            onEdit={(product) => navigate(`/products/${product.id}/edit`)}
            onToggleStatus={handleToggleStatus}
            onDuplicate={handleDuplicate}
            onBarcode={(product) => setBarcodeProduct(product)}
            onStockAdjustment={(product) => setStockProduct(product)}
            onPriceChange={(product) => setPriceProduct(product)}
            onArchive={(product) => setArchiveProduct(product)}
            onDelete={(product) => setDeleteProduct(product)} />
          

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
