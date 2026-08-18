import { translateText } from "../../../../localization/i18n";import { useEffect, useMemo, useState } from "react";

import { Plus, Trash2 } from "lucide-react";

import {
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Textarea } from
"../../../../shared/ui";

import {
  formatPurchaseMoney,
  getLastPurchasePrice,
  getPriceDifference } from
"../../utils/purchaseHelpers";

import { getStoredPurchases } from "../../utils/purchasesStorage";

import { getStoredProducts } from "../../../products/utils/productsStorage";

import { getStoredWarehouses } from "../../../warehouse/utils/warehouseManagementStorage";

import { getStoredSuppliers } from "../../../suppliers/utils/suppliersStorage";
import "./PurchaseForm.scss";

const getToday = () => new Date().toISOString().slice(0, 10);

const createEmptyItem = () => ({
  id: `item-${Date.now()}-${Math.random()}`,
  productId: "",
  quantity: "",
  purchasePrice: ""
});

const PurchaseForm = ({ initialValues, onSubmit, onCancel, onDraftChange }) => {
  const products = useMemo(
    () =>
    getStoredProducts().filter(
      (product) => product.status === "ACTIVE" && product.type !== "SERVICE"
    ),
    []
  );

  const warehouses = useMemo(
    () =>
    getStoredWarehouses().filter(
      (warehouse) => warehouse.status === "ACTIVE"
    ),
    []
  );

  const [supplierId, setSupplierId] = useState(initialValues?.supplierId || "");

  const [warehouseId, setWarehouseId] = useState(
    initialValues?.warehouseId || warehouses[0]?.id || ""
  );

  const [orderDate, setOrderDate] = useState(
    initialValues?.orderDate || getToday()
  );

  const [expectedDate, setExpectedDate] = useState(
    initialValues?.expectedDate || ""
  );

  const [status, setStatus] = useState(initialValues?.status || "ORDERED");

  const [paidAmount, setPaidAmount] = useState(initialValues?.paidAmount ?? "");

  const [note, setNote] = useState(initialValues?.note || "");

  const purchases = useMemo(() => getStoredPurchases(), []);

  const suppliers = useMemo(
    () =>
    getStoredSuppliers().filter((supplier) => supplier.status === "ACTIVE"),
    []
  );

  const [items, setItems] = useState(
    initialValues?.items?.length ?
    initialValues.items.map((item) => ({
      id: item.id || `item-${Date.now()}-${Math.random()}`,

      productId: item.productId,

      quantity: item.quantity,

      purchasePrice: item.purchasePrice
    })) :
    [createEmptyItem()]
  );

  const [errors, setErrors] = useState({});

  const productOptions = products.map((product) => ({
    value: product.id,
    label: `${product.name} · ${product.sku}`
  }));

  const warehouseOptions = warehouses.map((warehouse) => ({
    value: warehouse.id,
    label: warehouse.name
  }));

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.id,

    label: supplier.name
  }));

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
      total + Number(item.quantity || 0) * Number(item.purchasePrice || 0),
      0
    );
  }, [items]);

  const paid = Number(paidAmount || 0);

  const debt = Math.max(subtotal - paid, 0);

  const handleItemChange = (itemId, field, value) => {
    setItems((current) =>
    current.map((item) =>
    item.id === itemId ?
    {
      ...item,
      [field]: value
    } :
    item
    )
    );
  };

  useEffect(() => {
    if (!onDraftChange) {
      return;
    }

    const timer = setTimeout(() => {
      onDraftChange({
        supplierId,
        warehouseId,
        orderDate,
        expectedDate,
        status,
        paidAmount,
        note,
        items
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [
  supplierId,
  warehouseId,
  orderDate,
  expectedDate,
  status,
  paidAmount,
  note,
  items,
  onDraftChange]
  );

  const handleProductSelect = (itemId, productId) => {
    const product = products.find((item) => item.id === productId);

    setItems((current) =>
    current.map((item) =>
    item.id === itemId ?
    {
      ...item,

      productId,

      purchasePrice: product?.cost ?? item.purchasePrice
    } :
    item
    )
    );
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

    if (!supplierId) {
      nextErrors.supplier = "Yetkazib beruvchini tanlang.";
    }

    if (!warehouseId) {
      nextErrors.warehouse = "Omborni tanlang.";
    }

    const hasInvalidItem = items.some(
      (item) =>
      !item.productId ||
      Number(item.quantity) <= 0 ||
      Number(item.purchasePrice) < 0
    );

    if (hasInvalidItem) {
      nextErrors.items = "Mahsulot, miqdor va xarid narxini tekshiring.";
    }

    if (paid < 0) {
      nextErrors.payment = "To‘lov manfiy bo‘lishi mumkin emas.";
    }

    if (paid > subtotal) {
      nextErrors.payment = "To‘lov jami summadan katta bo‘lishi mumkin emas.";
    }

    setErrors(nextErrors);

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
        (productItem) => productItem.id === item.productId
      );

      const quantity = Number(item.quantity);

      const purchasePrice = Number(item.purchasePrice);

      return {
        id: item.id,

        productId: product.id,

        productName: product.name,

        sku: product.sku,

        unit: product.unit,

        quantity,

        receivedQuantity: initialValues ?
        Number(item.receivedQuantity || 0) :
        0,

        purchasePrice,

        total: quantity * purchasePrice
      };
    });

    const purchase = {
      id: initialValues?.id,

      number: initialValues?.number,

      supplierId,

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

      note: note.trim()
    };

    onSubmit?.(purchase);
  };

  return (
    <form className="purchase-form" onSubmit={handleSubmit}>
      <Card padding="lg" className="purchase-form__section">
        <div className="purchase-form__section-header">
          <div>
            <h3>{translateText("Xarid ma’lumotlari")}</h3>

            <p>{translateText("Yetkazib beruvchi va qabul qiluvchi ombor.")}</p>
          </div>
        </div>

        <div className="purchase-form__grid">
          <Select
            label={translateText("Yetkazib beruvchi")}
            value={supplierId}
            placeholder={translateText("Tanlang")}
            options={supplierOptions}
            error={errors.supplier}
            onChange={(event) => setSupplierId(event.target.value)} />
          

          <Select
            label={translateText("Qabul qiluvchi ombor")}
            value={warehouseId}
            placeholder={translateText("Ombor tanlang")}
            options={warehouseOptions}
            error={errors.warehouse}
            onChange={(event) => setWarehouseId(event.target.value)} />
          

          <DatePicker
            label={translateText("Buyurtma sanasi")}
            value={orderDate}
            onChange={(event) => setOrderDate(event.target.value)} />
          

          <DatePicker
            label={translateText("Kutilayotgan sana")}
            value={expectedDate}
            onChange={(event) => setExpectedDate(event.target.value)} />
          
        </div>
      </Card>

      <Card padding="lg" className="purchase-form__section">
        <div className="purchase-form__section-header">
          <div>
            <h3>{translateText("Mahsulotlar")}</h3>

            <p>{translateText("Xarid qilinayotgan mahsulot yoki xomashyolar.")}</p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={handleAddItem}>{translateText("Mahsulot qo‘shish")}


          </Button>
        </div>

        <div className="purchase-form__items">
          {items.map((item, index) => {
            const product = products.find(
              (productItem) => productItem.id === item.productId
            );

            const rowTotal =
            Number(item.quantity || 0) * Number(item.purchasePrice || 0);

            const lastPurchasePrice = item.productId ?
            getLastPurchasePrice({
              purchases,
              productId: item.productId,
              excludePurchaseId: initialValues?.id
            }) :
            null;

            const priceDifference = getPriceDifference(
              item.purchasePrice,
              lastPurchasePrice
            );

            return (
              <div key={item.id} className="purchase-form__item">
                <div className="purchase-form__item-number">{index + 1}</div>

                <div className="purchase-form__item-product">
                  <Select
                    label={translateText("Mahsulot")}
                    value={item.productId}
                    placeholder={translateText("Mahsulot tanlang")}
                    options={productOptions}
                    onChange={(event) =>
                    handleProductSelect(item.id, event.target.value)
                    } />
                  
                </div>

                <Input
                  label={translateText("Miqdor")}
                  type="number"
                  min="0"
                  value={item.quantity}
                  placeholder="0"
                  onChange={(event) =>
                  handleItemChange(item.id, "quantity", event.target.value)
                  } />
                

                <Input
                  label={translateText("Xarid narxi")}
                  type="number"
                  min="0"
                  value={item.purchasePrice}
                  placeholder="0"
                  onChange={(event) =>
                  handleItemChange(
                    item.id,
                    "purchasePrice",
                    event.target.value
                  )
                  } />
                
                {lastPurchasePrice !== null &&
                <div className="purchase-form__last-price">
                    <span>{translateText("Oxirgi xarid:")}
                    {" "}
                      <strong>
                        {formatPurchaseMoney(lastPurchasePrice)}{translateText("so‘m")}
                    </strong>
                    </span>

                    {priceDifference && Number(item.purchasePrice) > 0 &&
                  <small
                    className={
                    priceDifference.amount > 0 ?
                    "purchase-form__last-price-diff purchase-form__last-price-diff--up" :
                    priceDifference.amount < 0 ?
                    "purchase-form__last-price-diff purchase-form__last-price-diff--down" :
                    "purchase-form__last-price-diff"
                    }>
                    
                        {priceDifference.amount > 0 ? "+" : ""}
                        {formatPurchaseMoney(priceDifference.amount)}{translateText("so‘m")}
                    {priceDifference.percent !== null &&
                    <>
                            {" "}
                            ({priceDifference.percent > 0 ? "+" : ""}
                            {priceDifference.percent.toFixed(1)}
                            %)
                          </>
                    }
                      </small>
                  }
                  </div>
                }

                <div className="purchase-form__item-total">
                  <span>{translateText("Jami")}</span>

                  <strong>{formatPurchaseMoney(rowTotal)}{translateText("so‘m")}</strong>

                  {product && <small>{product.unit}</small>}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  title={translateText("Olib tashlash")}
                  disabled={items.length <= 1}
                  onClick={() => handleRemoveItem(item.id)}>
                  
                  <Trash2 size={16} />
                </Button>
              </div>);

          })}
        </div>

        {errors.items &&
        <div className="purchase-form__error">{errors.items}</div>
        }
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
              value={paidAmount}
              placeholder="0"
              onChange={(event) => setPaidAmount(event.target.value)} />
            

            <div className="purchase-form__payment-summary">
              <SummaryRow
                label={translateText("Jami")}
                value={`${formatPurchaseMoney(subtotal)} so‘m`} />
              

              <SummaryRow
                label={translateText("To‘langan")}
                value={`${formatPurchaseMoney(paid)} so‘m`} />
              

              <SummaryRow
                label={translateText("Qarz")}
                value={`${formatPurchaseMoney(debt)} so‘m`}
                strong />
              
            </div>

            {errors.payment &&
            <div className="purchase-form__error">{errors.payment}</div>
            }
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
              label: translateText("Qoralama")
            },
            {
              value: "ORDERED",
              label: translateText("Buyurtma berilgan")
            }]
            }
            onChange={(event) => setStatus(event.target.value)} />
          

          <Textarea
            label={translateText("Izoh")}
            placeholder={translateText("Xarid bo‘yicha qo‘shimcha ma’lumot...")}
            value={note}
            onChange={(event) => setNote(event.target.value)} />
          
        </Card>
      </div>

      <div className="purchase-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel}>{translateText("Bekor qilish")}

        </Button>

        <Button type="submit">
          {initialValues ? "O‘zgarishlarni saqlash" : "Xarid yaratish"}
        </Button>
      </div>
    </form>);

};

const SummaryRow = ({ label, value, strong = false }) =>
<div className="purchase-form__summary-row">
    <span>{label}</span>

    <strong className={strong ? "purchase-form__summary-row--strong" : ""}>
      {value}
    </strong>
  </div>;

export default PurchaseForm;
