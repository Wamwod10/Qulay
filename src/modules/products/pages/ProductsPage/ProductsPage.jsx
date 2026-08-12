import { useEffect, useMemo, useState } from "react";

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
  TableToolbar,
} from "../../../../shared/ui";

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
  updateStoredProductPrices,
} from "../../utils/productsStorage";

import { getStockStatus } from "../../utils/productHelpers";

import "./ProductsPage.scss";

const PAGE_SIZE = 10;

const ProductsPage = () => {
  const navigate = useNavigate();

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

      const matchesStatus = statusFilter
        ? product.status === statusFilter
        : product.status !== "ARCHIVED";

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesStatus &&
        matchesStock
      );
    });
  }, [products, search, typeFilter, categoryFilter, statusFilter, stockFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));

  const paginatedProducts = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;

    return filteredProducts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredProducts, page]);

  const stats = useMemo(() => {
    const visibleProducts = products.filter((product) => product.status !== "ARCHIVED");

    return {
      total: visibleProducts.length,
      active: visibleProducts.filter((product) => product.status === "ACTIVE").length,
      lowStock: visibleProducts.filter(
        (product) => getStockStatus(product) === "LOW_STOCK",
      ).length,
      outOfStock: visibleProducts.filter(
        (product) => getStockStatus(product) === "OUT_OF_STOCK",
      ).length,
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
    search || typeFilter || categoryFilter || statusFilter || stockFilter,
  );

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setCategoryFilter("");
    setStatusFilter("");
    setStockFilter("");
  };

  const handleToggleStatus = (product) => {
    toggleStoredProductStatus(product.id);
    refreshProducts();
  };

  const handleDuplicate = (product) => {
    const duplicatedProduct = duplicateStoredProduct(product.id);

    refreshProducts();

    if (duplicatedProduct) {
      navigate(`/products/${duplicatedProduct.id}/edit`);
    }
  };

  const handleStockAdjustment = (values) => {
    const updatedProduct = adjustStoredProductStock(values);

    if (updatedProduct) {
      setStockProduct(null);
      refreshProducts();
    }
  };

  const handlePriceChange = (values) => {
    const updatedProduct = updateStoredProductPrices(values);

    if (updatedProduct) {
      setPriceProduct(null);
      refreshProducts();
    }
  };

  const handleArchiveOrRestore = () => {
    if (!archiveProduct) {
      return;
    }

    if (archiveProduct.status === "ARCHIVED") {
      restoreStoredProduct(archiveProduct.id);
    } else {
      archiveStoredProduct(archiveProduct.id);
    }

    setArchiveProduct(null);
    refreshProducts();
  };

  const handleDelete = () => {
    if (!deleteProduct) {
      return;
    }

    deleteStoredProduct(deleteProduct.id);
    setDeleteProduct(null);
    refreshProducts();
  };

  const archiveDialogIsRestore = archiveProduct?.status === "ARCHIVED";

  return (
    <PageContainer
      title="Mahsulotlar"
      description="Xomashyo, yarim tayyor, tayyor va savdo mahsulotlarini boshqarish."
    >
      <div className="products-page">
        <section className="products-page__stats">
          <Card variant="soft" padding="md" className="products-page__stat-card">
            <div className="products-page__stat-icon">
              <Package size={21} strokeWidth={1.8} />
            </div>

            <div>
              <span>Jami mahsulot</span>
              <strong>{stats.total}</strong>
            </div>
          </Card>

          <Card variant="soft" padding="md" className="products-page__stat-card">
            <div className="products-page__stat-icon products-page__stat-icon--success">
              <PackageCheck size={21} strokeWidth={1.8} />
            </div>

            <div>
              <span>Faol</span>
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
                strokeWidth={1.8}
              />
            </div>

            <div>
              <span>Kam qolgan</span>
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
                strokeWidth={1.8}
              />
            </div>

            <div>
              <span>Tugagan</span>
              <strong>{stats.outOfStock}</strong>
            </div>
          </Card>
        </section>

        <Card padding="md" className="products-page__workspace">
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Nomi, SKU yoki barcode bo'yicha qidirish..."
            actionLabel="Yangi mahsulot"
            actionIcon={<Plus size={17} strokeWidth={1.9} />}
            onAction={() => navigate("/products/create")}
          />

          <div className="products-page__filters">
            <div className="products-page__filter">
              <Select
                value={typeFilter}
                placeholder="Barcha turlar"
                options={PRODUCT_TYPES}
                onChange={(event) => setTypeFilter(event.target.value)}
              />
            </div>

            <div className="products-page__filter">
              <Select
                value={categoryFilter}
                placeholder="Barcha kategoriyalar"
                options={PRODUCT_CATEGORIES}
                onChange={(event) => setCategoryFilter(event.target.value)}
              />
            </div>

            <div className="products-page__filter">
              <Select
                value={stockFilter}
                placeholder="Barcha qoldiq"
                options={[
                  { value: "IN_STOCK", label: "Yetarli" },
                  { value: "LOW_STOCK", label: "Kam qolgan" },
                  { value: "OUT_OF_STOCK", label: "Tugagan" },
                ]}
                onChange={(event) => setStockFilter(event.target.value)}
              />
            </div>

            <div className="products-page__filter">
              <Select
                value={statusFilter}
                placeholder="Barcha holatlar"
                options={[
                  { value: "ACTIVE", label: "Faol" },
                  { value: "INACTIVE", label: "Faol emas" },
                  { value: "ARCHIVED", label: "Arxiv" },
                ]}
                onChange={(event) => setStatusFilter(event.target.value)}
              />
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={handleClearFilters}>
                Filtrlarni tozalash
              </Button>
            )}
          </div>

          <div className="products-page__result-info">
            <span>
              {filteredProducts.length} ta mahsulot
              {statusFilter ? "" : " (arxivsiz)"}
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
            onDelete={(product) => setDeleteProduct(product)}
          />

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </Card>
      </div>

      <BarcodeQrModal
        product={barcodeProduct}
        open={Boolean(barcodeProduct)}
        onClose={() => setBarcodeProduct(null)}
      />

      <StockAdjustmentModal
        product={stockProduct}
        open={Boolean(stockProduct)}
        onClose={() => setStockProduct(null)}
        onSubmit={handleStockAdjustment}
      />

      <PriceChangeModal
        product={priceProduct}
        open={Boolean(priceProduct)}
        onClose={() => setPriceProduct(null)}
        onSubmit={handlePriceChange}
      />

      <ConfirmDialog
        open={Boolean(archiveProduct)}
        title={archiveDialogIsRestore ? "Arxivdan qaytarish" : "Arxivga o'tkazish"}
        description={
          archiveProduct
            ? `"${archiveProduct.name}" mahsuloti ${
                archiveDialogIsRestore
                  ? "faol holatga qaytariladi."
                  : "arxivga o'tkaziladi."
              }`
            : ""
        }
        confirmText={archiveDialogIsRestore ? "Qaytarish" : "Arxivlash"}
        onClose={() => setArchiveProduct(null)}
        onConfirm={handleArchiveOrRestore}
      />

      <ConfirmDialog
        open={Boolean(deleteProduct)}
        title="Mahsulotni o'chirish"
        description={
          deleteProduct
            ? `"${deleteProduct.name}" butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`
            : ""
        }
        confirmText="O'chirish"
        danger
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
};

export default ProductsPage;
