import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { translateText } from "../../../../localization/i18n";

import {
  Button,
  Card,
  CreatableSelect,
  DatePicker,
  Input,
  Select,
  Textarea,
} from "../../../../shared/ui";

import {
  getCanonicalUnitCost,
  formatPurchaseMoney,
  getLastPurchasePrice,
  getPriceDifference,
} from "../../utils/purchaseHelpers";

import { getStoredPurchases } from "../../utils/purchasesStorage";

import { getStoredProducts } from "../../../products/utils/productsStorage";
import { getStoredProductsPage } from "../../../products/utils/productsStorage";
import ProductFormModal from "../../../products/components/ProductFormModal/ProductFormModal";

import { fetchStoredWarehouses, getStoredWarehouses } from "../../../warehouse/utils/warehouseManagementStorage";
import { getDefaultWarehouseId } from "../../../warehouse/utils/warehouseDefaults";

import {
  createSupplier,
  fetchStoredSuppliers,
  getStoredSuppliers,
} from "../../../suppliers/utils/suppliersStorage";

import { UNIT_DEFINITIONS, UNIT_OPTIONS, convertQuantity, safeNormalizeUnit } from "../../../../shared/utils/units";

import { focusFirstInvalidField } from "../../../../shared/utils/formFocus";

import "./PurchaseForm.scss";

const getToday = () => new Date().toISOString().slice(0, 10);

const createEmptyItem = () => ({
  id: `item-${Date.now()}-${Math.random()}`,
  productId: "",
  quantity: "",
  purchasePrice: "",
  unit: "",
});

const PurchaseForm = ({ initialValues, onSubmit, onCancel, onDraftChange, submitError = "", submitting = false }) => {
  const [productList, setProductList] = useState(() =>
    getStoredProducts().filter(
      (product) => product.status === "ACTIVE" && product.type !== "SERVICE",
    ),
  );

  const products = productList;

  const [warehouseList, setWarehouseList] = useState(() =>
    getStoredWarehouses().filter((warehouse) => warehouse.status === "ACTIVE"),
  );

  const warehouses = warehouseList;

  const [supplierId, setSupplierId] = useState(initialValues?.supplierId || "");

  const [warehouseId, setWarehouseId] = useState(
    initialValues?.warehouseId || getDefaultWarehouseId(warehouses) || "",
  );

  const [orderDate, setOrderDate] = useState(
    initialValues?.orderDate || getToday(),
  );

  const [expectedDate, setExpectedDate] = useState(
    initialValues?.expectedDate || "",
  );

  const [status, setStatus] = useState(initialValues?.status || "ORDERED");

  const [paidAmount] = useState(initialValues?.paidAmount ?? 0);

  const [note, setNote] = useState(initialValues?.note || "");

  const purchases = useMemo(() => getStoredPurchases(), []);

  const [supplierList, setSupplierList] = useState(() =>
    getStoredSuppliers().filter((supplier) => supplier.status === "ACTIVE"),
  );
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [referenceErrors, setReferenceErrors] = useState({});

  const suppliers = supplierList;

  const [items, setItems] = useState(
    initialValues?.items?.length
      ? initialValues.items.map((item) => ({
          id: item.id || `item-${Date.now()}-${Math.random()}`,
          productId: item.productId,
          quantity: item.purchaseQuantity ?? item.quantity,
          purchasePrice:
            item.unitPrice ??
            item.purchasePrice ??
            (Number((item.purchaseQuantity ?? item.quantity) || 0) > 0
              ? Number(item.subtotal ?? item.total ?? 0) / Number(item.purchaseQuantity ?? item.quantity)
              : 0),
          unit: item.purchaseUnit || item.unit || "",
          receivedQuantity: Number(item.receivedQuantity || 0),
        }))
      : [createEmptyItem()],
  );

  const [errors, setErrors] = useState({});
  const [productModalItemId, setProductModalItemId] = useState(null);

  const productOptions = products.map((product) => ({
    value: product.id,
    label: product.sku ? `${product.name} · ${product.sku}` : product.name,
  }));

  const warehouseOptions = warehouses.map((warehouse) => ({
    value: warehouse.id,
    label: warehouse.name,
  }));

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.id,
    label: [supplier.name, supplier.companyName, supplier.phone].filter(Boolean).join(" · "),
    searchText: [supplier.name, supplier.companyName, supplier.contactPerson, supplier.phone].filter(Boolean).join(" | "),
  }));

  useEffect(() => {
    let alive = true;

    const loadSuppliers = async () => {
      setSupplierLoading(true);
      try {
        const remoteSuppliers = await fetchStoredSuppliers();
        if (!alive) return;
        setSupplierList(remoteSuppliers.filter((supplier) => supplier.status === "ACTIVE"));
        setReferenceErrors((current) => ({ ...current, suppliers: "" }));
      } catch (error) {
        if (alive) {
          setReferenceErrors((current) => ({ ...current, suppliers: error?.message || "Yetkazib beruvchilarni yuklab bo'lmadi." }));
        }
      } finally {
        if (alive) setSupplierLoading(false);
      }
    };

    const loadWarehouses = async () => {
      setWarehouseLoading(true);
      try {
        const remoteWarehouses = await fetchStoredWarehouses();
        if (!alive) return;
        const activeWarehouses = remoteWarehouses.filter((warehouse) => warehouse.status === "ACTIVE");
        setWarehouseList(activeWarehouses);
        if (!initialValues?.warehouseId) {
          setWarehouseId((current) => current || getDefaultWarehouseId(activeWarehouses) || activeWarehouses[0]?.id || "");
        }
        setReferenceErrors((current) => ({ ...current, warehouses: "" }));
      } catch (error) {
        if (alive) {
          setReferenceErrors((current) => ({ ...current, warehouses: error?.message || "Omborlarni yuklab bo'lmadi." }));
        }
      } finally {
        if (alive) setWarehouseLoading(false);
      }
    };

    const loadProducts = async () => {
      setProductLoading(true);
      try {
        const remoteProducts = await getStoredProductsPage({ limit: 500, status: "ACTIVE", type: "", skipCache: true });
        if (!alive) return;
        setProductList((remoteProducts.products || []).filter((product) => product.status === "ACTIVE" && product.type !== "SERVICE"));
        setReferenceErrors((current) => ({ ...current, products: "" }));
      } catch (error) {
        if (alive) {
          setReferenceErrors((current) => ({ ...current, products: error?.message || "Mahsulotlarni yuklab bo'lmadi." }));
        }
      } finally {
        if (alive) setProductLoading(false);
      }
    };

    loadSuppliers();
    loadWarehouses();
    loadProducts();

    return () => {
      alive = false;
    };
  }, [initialValues?.warehouseId]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + Number(item.quantity || 0) * Number(item.purchasePrice || 0),
        0,
      ),
    [items],
  );

  const paid = Number(paidAmount || 0);
  const debt = 0;

  const handleItemChange = (itemId, field, value) => {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  useEffect(() => {
    if (!onDraftChange) {
      return undefined;
    }

    const timer = setTimeout(() => {
      onDraftChange({
        supplierId,
        warehouseId,
        orderDate,
        expectedDate,
        status,
        note,
        items,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [
    supplierId,
    warehouseId,
    orderDate,
    expectedDate,
    status,
    note,
    items,
    onDraftChange,
  ]);

  const handleProductSelect = (itemId, productId, selectedProduct = null) => {
    const product = selectedProduct || products.find((item) => item.id === productId);

    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              productId,
              purchasePrice: item.purchasePrice,
              unit: product?.unit || item.unit || "",
            }
          : item,
      ),
    );
  };

  const handleProductCreated = (product) => {
    setProductList((current) => [
      product,
      ...current.filter((item) => item.id !== product.id),
    ]);

    if (productModalItemId) {
      handleProductSelect(productModalItemId, product.id, product);
    }
  };

  const handleAddItem = () => {
    setItems((current) => [...current, createEmptyItem()]);
  };

  const handleRemoveItem = (itemId) => {
    if (items.length <= 1) {
      return;
    }

    setItems((current) => current.filter((item) => item.id !== itemId));
  };

  const validate = () => {
    const nextErrors = {};

    if (!warehouseId) {
      nextErrors.warehouse = "Omborni tanlang.";
    }

    const hasInvalidItem = items.some((item) => {
      const product = products.find((productItem) => productItem.id === item.productId);
      if (!product || Number(item.quantity) <= 0 || Number(item.purchasePrice) < 0) {
        return true;
      }

      try {
        convertQuantity(Number(item.quantity), item.unit || product.unit, product.unit);
        return false;
      } catch {
        return true;
      }
    });

    if (hasInvalidItem) {
      nextErrors.items = "Mahsulot, miqdor va xarid narxini tekshiring.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      focusFirstInvalidField();
    }

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const supplier = suppliers.find((item) => item.id === supplierId);

    const warehouse = warehouses.find((item) => item.id === warehouseId);

    const preparedItems = items.map((item) => {
      const product = products.find(
        (productItem) => productItem.id === item.productId,
      );

      if (!product) {
        return null;
      }

      const quantity = Number(item.quantity);

      const unitPrice = Number(item.purchasePrice);
      const lineTotal = quantity * unitPrice;
      const purchaseUnit = item.unit || product.unit;
      let canonicalQuantity = 0;
      let canonicalUnitCost = 0;

      try {
        canonicalQuantity = convertQuantity(quantity, purchaseUnit, product.unit);
        canonicalUnitCost = getCanonicalUnitCost({
          quantity,
          purchaseUnit,
          productUnit: product.unit,
          lineTotal,
        });
      } catch {
        canonicalQuantity = 0;
      }

      return {
        id: item.id,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        purchaseUnit,
        purchaseQuantity: quantity,
        quantity,
        receivedQuantity: initialValues
          ? Number(item.receivedQuantity || 0)
          : 0,
        purchasePrice: unitPrice,
        unitPrice,
        lineTotal,
        cost: canonicalUnitCost,
        salePrice: product.salePrice,
        total: lineTotal,
        subtotal: lineTotal,
        canonicalQuantity,
      };
    });

    if (preparedItems.some((item) => !item)) {
      setErrors((current) => ({
        ...current,
        items: "Tanlangan mahsulotlardan biri topilmadi.",
      }));

      focusFirstInvalidField();
      return;
    }

    const purchase = {
      id: initialValues?.id,
      number: initialValues?.number,

      supplierId: supplierId || null,
      supplierName: supplier?.name || "—",

      warehouseId,
      warehouseName: warehouse?.name || "—",

      orderDate,
      expectedDate,
      status,

      items: preparedItems,

      subtotal,
      discount: 0,
      tax: 0,
      total: subtotal,

      paidAmount: paid,
      debtAmount: debt,

      note: note.trim(),
    };

    onSubmit?.(purchase);
  };

  return (
    <>
      <form className="purchase-form" onSubmit={handleSubmit}>
      {submitError && <div className="purchase-form__error" role="alert">{submitError}</div>}
      <Card padding="lg" className="purchase-form__section">
        <div className="purchase-form__section-header">
          <div>
            <h3>{translateText("Xarid ma’lumotlari")}</h3>

            <p>{translateText("Yetkazib beruvchi va qabul qiluvchi ombor.")}</p>
          </div>
        </div>

        <div className="purchase-form__grid">
          <CreatableSelect
            label={translateText("Yetkazib beruvchi")}
            value={supplierId}
            placeholder={supplierLoading ? translateText("Yuklanmoqda...") : translateText("Tanlang")}
            options={supplierOptions}
            error={errors.supplier}
            disabled={supplierLoading}
            getOptionSearchText={(option) => option.searchText}
            onChange={(event) => setSupplierId(event.target.value)}
            onCreate={async (name) => {
              const created = await createSupplier(
                { name },
                {
                  inlineModule: "purchases",
                },
              );

              setSupplierList((current) => [
                created,
                ...current.filter((item) => item.id !== created.id),
              ]);

              setSupplierId(created.id);

              fetchStoredSuppliers()
                .then((items) => setSupplierList(items.filter((supplier) => supplier.status === "ACTIVE")))
                .catch(() => undefined);

              return created;
            }}
          />

          <Select
            label={translateText("Qabul qiluvchi ombor")}
            value={warehouseId}
            placeholder={warehouseLoading ? translateText("Omborlar yuklanmoqda...") : translateText("Ombor tanlang")}
            options={warehouseOptions}
            required
            autoSelectFirst
            error={errors.warehouse || referenceErrors.warehouses}
            disabled={warehouseLoading}
            onChange={(event) => setWarehouseId(event.target.value)}
          />

          <DatePicker
            label={translateText("Buyurtma sanasi")}
            value={orderDate}
            onChange={(event) => setOrderDate(event.target.value)}
          />

          <DatePicker
            label={translateText("Kutilayotgan sana")}
            value={expectedDate}
            onChange={(event) => setExpectedDate(event.target.value)}
          />
        </div>
        {(referenceErrors.suppliers || referenceErrors.products) && (
          <div className="purchase-form__error">
            {[referenceErrors.suppliers, referenceErrors.products].filter(Boolean).join(" ")}
          </div>
        )}
      </Card>

      <Card padding="lg" className="purchase-form__section">
        <div className="purchase-form__section-header">
          <div>
            <h3>{translateText("Mahsulotlar")}</h3>

            <p>
              {translateText("Xarid qilinayotgan mahsulot yoki xomashyolar.")}
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={handleAddItem}
          >
            {translateText("Mahsulot qo‘shish")}
          </Button>
        </div>

        <div className="purchase-form__items">
          {items.map((item) => {
            const product = products.find(
              (productItem) => productItem.id === item.productId,
            );

            const rowTotal = Number(item.quantity || 0) * Number(item.purchasePrice || 0);
            const purchaseUnit = item.unit || product?.unit || "";
            const canonicalUnitCost = product
              ? getCanonicalUnitCost({
                  quantity: item.quantity,
                  purchaseUnit,
                  productUnit: product.unit,
                  lineTotal: rowTotal,
                })
              : 0;

            const lastPurchasePrice = item.productId
              ? getLastPurchasePrice({
                  purchases,
                  productId: item.productId,
                  excludePurchaseId: initialValues?.id,
                })
              : null;

            const priceDifference = getPriceDifference(
              canonicalUnitCost,
              lastPurchasePrice,
            );

            const allowedUnitOptions = product
              ? UNIT_OPTIONS.filter((option) => {
                  const productUnit = safeNormalizeUnit(product.unit);
                  return option.dimension === UNIT_DEFINITIONS[productUnit]?.dimension;
                })
              : UNIT_OPTIONS;

            return (
              <div key={item.id} className="purchase-form__item">
                <div className="purchase-form__item-product">
                  <div className="purchase-form__product-picker">
                    <Select
                      label={translateText("Mahsulot")}
                      value={item.productId}
                      placeholder={productLoading ? translateText("Mahsulotlar yuklanmoqda...") : translateText("Mahsulot tanlang")}
                      options={productOptions}
                      disabled={productLoading}
                      onChange={(event) =>
                        handleProductSelect(item.id, event.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<Plus size={15} />}
                      onClick={() => setProductModalItemId(item.id)}
                    >
                      {translateText("Yangi")}
                    </Button>
                    {product && <span>SKU: {product.sku || "-"}</span>}
                  </div>
                </div>

                <Select
                  label={translateText("Birlik")}
                  value={item.unit || product?.unit || ""}
                  options={allowedUnitOptions}
                  onChange={(event) =>
                    handleItemChange(item.id, "unit", event.target.value)
                  }
                />

                <Input
                  label={translateText("Miqdor")}
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={item.quantity}
                  placeholder="0"
                  onChange={(event) =>
                    handleItemChange(item.id, "quantity", event.target.value)
                  }
                />

                <Input
                  label={translateText(`Birlik narxi${purchaseUnit ? ` (${purchaseUnit})` : ""}`)}
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={item.purchasePrice}
                  placeholder="0"
                  onChange={(event) =>
                    handleItemChange(
                      item.id,
                      "purchasePrice",
                      event.target.value,
                    )
                  }
                />

                {lastPurchasePrice !== null && (
                  <div className="purchase-form__last-price">
                    <span>
                      {translateText("Oxirgi xarid:")}{" "}
                      <strong>{formatPurchaseMoney(lastPurchasePrice)} / {product?.unit}</strong>
                    </span>

                    {priceDifference && canonicalUnitCost > 0 && (
                      <small
                        className={
                          priceDifference.amount > 0
                            ? "purchase-form__last-price-diff purchase-form__last-price-diff--up"
                            : priceDifference.amount < 0
                              ? "purchase-form__last-price-diff purchase-form__last-price-diff--down"
                              : "purchase-form__last-price-diff"
                        }
                      >
                        {priceDifference.amount > 0 ? "+" : ""}

                        {formatPurchaseMoney(priceDifference.amount)}

                        {priceDifference.percent !== null && (
                          <>
                            {" "}
                            ({priceDifference.percent > 0 ? "+" : ""}
                            {priceDifference.percent.toFixed(1)}
                            %)
                          </>
                        )}
                      </small>
                    )}
                  </div>
                )}

                <div className="purchase-form__item-total">
                  <span>{translateText("Jami")}</span>

                  <strong>{formatPurchaseMoney(rowTotal)}</strong>

                  {product && (
                    <small>
                      {canonicalUnitCost > 0
                        ? `${formatPurchaseMoney(canonicalUnitCost)} / ${product.unit}`
                        : `${item.unit || product.unit}`}
                    </small>
                  )}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  title={translateText("Olib tashlash")}
                  aria-label={translateText("Mahsulotni olib tashlash")}
                  className="purchase-form__item-delete"
                  disabled={items.length <= 1}
                  onClick={() => handleRemoveItem(item.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            );
          })}
        </div>

        {errors.items && (
          <div className="purchase-form__error">{errors.items}</div>
        )}
      </Card>

      <div className="purchase-form__bottom-grid">
        <Card padding="lg" className="purchase-form__section">
          <div className="purchase-form__section-header">
            <div>
              <h3>{translateText("To‘lov")}</h3>

              <p>{translateText("To‘langan va qarz summasi.")}</p>
            </div>
          </div>

          <div className="purchase-form__payment">
            <Input
              label={translateText("To‘langan summa")}
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={paidAmount}
              placeholder="0"
              disabled
              hint={translateText("To'lov xarid qabul qilingandan keyin alohida kiritiladi.")}
            />

            <div className="purchase-form__payment-summary">
              <SummaryRow
                label={translateText("Jami")}
                value={formatPurchaseMoney(subtotal)}
              />

              <SummaryRow
                label={translateText("To‘langan")}
                value={formatPurchaseMoney(paid)}
              />

              <SummaryRow
                label={translateText("Qarz")}
                value={formatPurchaseMoney(debt)}
                strong
              />
            </div>

            {errors.payment && (
              <div className="purchase-form__error">{errors.payment}</div>
            )}
          </div>
        </Card>

        <Card padding="lg" className="purchase-form__section">
          <div className="purchase-form__section-header">
            <div>
              <h3>{translateText("Holat")}</h3>

              <p>{translateText("Buyurtmaning joriy holati.")}</p>
            </div>
          </div>

          <Select
            label={translateText("Holat")}
            value={status}
            options={[
              {
                value: "DRAFT",
                label: translateText("Qoralama"),
              },
              {
                value: "ORDERED",
                label: translateText("Buyurtma berilgan"),
              },
            ]}
            onChange={(event) => setStatus(event.target.value)}
          />

          <Textarea
            label={translateText("Izoh")}
            placeholder={translateText("Xarid bo‘yicha qo‘shimcha ma’lumot...")}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Card>
      </div>

      <div className="purchase-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {translateText("Bekor qilish")}
        </Button>

        <Button type="submit" disabled={submitting}>
          {translateText(
            initialValues ? "O‘zgarishlarni saqlash" : "Xarid yaratish",
          )}
        </Button>
      </div>
      </form>

      <ProductFormModal
        open={Boolean(productModalItemId)}
        onClose={() => setProductModalItemId(null)}
        onCreated={handleProductCreated}
        inlineModule="purchases"
        defaultValues={{ warehouseId, supplierId: supplierId || "" }}
      />
    </>
  );
};

const SummaryRow = ({ label, value, strong = false }) => (
  <div className="purchase-form__summary-row">
    <span>{label}</span>

    <strong className={strong ? "purchase-form__summary-row--strong" : ""}>
      {value}
    </strong>
  </div>
);

export default PurchaseForm;
