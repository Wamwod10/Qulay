import { useEffect, useMemo, useRef, useState } from "react";

import {
  AlertTriangle,
  Ban,
  Barcode,
  Minus,
  Package,
  PauseCircle,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";

import { getStoredAgents } from "../../../../agents/utils/agentsStorage";
import { getStoredCustomers } from "../../../../customers/utils/customersStorage";
import { getStoredProducts } from "../../../../products/utils/productsStorage";
import { getStoredWarehouseStock } from "../../../../warehouse/utils/warehouseStorage";
import { getStoredWarehouses } from "../../../../warehouse/utils/warehouseManagementStorage";

import {
  Badge,
  Button,
  Card,
  Input,
  LiveIcon,
  Modal,
  Select,
  Textarea,
} from "../../../../../shared/ui";

import ReceiptPreview from "../../components/ReceiptPreview/ReceiptPreview";

import { calculateSaleTotals, roundMoney } from "../../../utils/salesCalculations";
import { completeSale, getStoredSales, holdSale } from "../../../utils/salesStorage";
import { formatSaleMoney } from "../../../utils/salesHelpers";

import "./POSTerminalPage.scss";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Naqd" },
  { value: "CARD", label: "Karta" },
  { value: "BANK", label: "Bank" },
  { value: "QR", label: "QR" },
  { value: "DEBT", label: "Qarz" },
];

const DECIMAL_UNITS = ["kg", "l", "litr", "metr"];

const emptyPayment = () => ({ id: `${Date.now()}-${Math.random()}`, method: "CASH", amount: "" });

const POSTerminalPage = () => {
  const searchRef = useRef(null);
  const completingRef = useRef(false);

  const [products, setProducts] = useState(() => getStoredProducts());
  const [stock, setStock] = useState(() => getStoredWarehouseStock());
  const [sales, setSales] = useState(() => getStoredSales());
  const [warehouses] = useState(() =>
    getStoredWarehouses().filter((warehouse) => warehouse.status !== "INACTIVE"),
  );
  const [customers] = useState(() =>
    getStoredCustomers().filter((customer) => customer.status !== "INACTIVE"),
  );
  const [agents] = useState(() =>
    getStoredAgents().filter((agent) => agent.status === "ACTIVE"),
  );

  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || "");
  const [customerId, setCustomerId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [discountType, setDiscountType] = useState("AMOUNT");
  const [discountValue, setDiscountValue] = useState("");
  const [note, setNote] = useState("");
  const [activeDraft, setActiveDraft] = useState(null);
  const [error, setError] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState(null);
  const [payments, setPayments] = useState([emptyPayment()]);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const refresh = () => {
      setProducts(getStoredProducts());
      setStock(getStoredWarehouseStock());
      setSales(getStoredSales());
    };

    window.addEventListener("sales:changed", refresh);
    window.addEventListener("warehouse:changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("sales:changed", refresh);
      window.removeEventListener("warehouse:changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === warehouseId);
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const selectedAgent = agents.find((agent) => agent.id === agentId);

  useEffect(() => {
    if (!selectedCustomer?.agentId) {
      return;
    }

    const assignedAgent = agents.find((agent) => agent.id === selectedCustomer.agentId);

    if (assignedAgent && !agentId) {
      setAgentId(assignedAgent.id);
    }
  }, [agentId, agents, selectedCustomer]);

  const stockByProduct = useMemo(() => {
    const map = new Map();

    stock
      .filter((item) => item.warehouseId === warehouseId)
      .forEach((item) => {
        map.set(item.productId, {
          ...item,
          available: Math.max(Number(item.quantity || 0) - Number(item.reserved || 0), 0),
        });
      });

    return map;
  }, [stock, warehouseId]);

  const categories = useMemo(() => {
    const list = products
      .filter((product) => product.status === "ACTIVE" && product.salePrice !== null)
      .map((product) => product.category)
      .filter(Boolean);

    return [...new Set(list)].map((item) => ({ value: item, label: item }));
  }, [products]);

  const sellableProducts = useMemo(() => {
    const searchText = query.trim().toLowerCase();

    return products
      .filter((product) => product.status === "ACTIVE" && product.salePrice !== null)
      .filter((product) => stockByProduct.has(product.id))
      .filter((product) => !category || product.category === category)
      .filter((product) => {
        if (!searchText) {
          return true;
        }

        return [product.name, product.sku, product.barcode]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(searchText);
      });
  }, [category, products, query, stockByProduct]);

  const totals = useMemo(
    () =>
      calculateSaleTotals({
        items: cart,
        discountType,
        discountValue,
        payments,
      }),
    [cart, discountType, discountValue, payments],
  );

  const draftSales = useMemo(
    () => sales.filter((sale) => sale.status === "DRAFT").slice(0, 12),
    [sales],
  );

  const addToCart = (product) => {
    setError("");

    const stockItem = stockByProduct.get(product.id);
    const available = Number(stockItem?.available || 0);

    if (available <= 0) {
      setError(`${product.name} omborda mavjud emas.`);
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      const step = DECIMAL_UNITS.includes(product.unit) ? 0.1 : 1;

      if (existing) {
        const nextQuantity = roundMoney(existing.quantity + step);

        if (nextQuantity > available) {
          setError(`${product.name} uchun qoldiq: ${available} ${product.unit}`);
          return current;
        }

        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: nextQuantity,
                subtotal: roundMoney(nextQuantity * item.price),
              }
            : item,
        );
      }

      return [
        ...current,
        {
          id: `${product.id}-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          quantity: step,
          unit: product.unit,
          price: Number(product.salePrice || 0),
          cost: Number(stockItem?.cost ?? product.cost ?? 0),
          subtotal: roundMoney(step * Number(product.salePrice || 0)),
        },
      ];
    });
  };

  const setItemQuantity = (productId, value) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.productId !== productId) {
            return item;
          }

          const stockItem = stockByProduct.get(productId);
          const available = Number(stockItem?.available || 0);
          const quantity = Math.min(Math.max(roundMoney(value), 1), available);

          return {
            ...item,
            quantity,
            subtotal: roundMoney(quantity * item.price),
          };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const changeItemQuantity = (item, direction) => {
    const step = DECIMAL_UNITS.includes(item.unit) ? 0.1 : 1;

    setItemQuantity(item.productId, roundMoney(item.quantity + direction * step));
  };

  const removeItem = (productId) => {
    setCart((current) => current.filter((item) => item.productId !== productId));
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    const text = query.trim().toLowerCase();
    const exactProduct = sellableProducts.find(
      (product) =>
        product.barcode?.toLowerCase() === text ||
        product.sku?.toLowerCase() === text ||
        product.name.toLowerCase() === text,
    );

    if (exactProduct) {
      addToCart(exactProduct);
      setQuery("");
      return;
    }

    if (sellableProducts.length === 1) {
      addToCart(sellableProducts[0]);
      setQuery("");
    }
  };

  const validateDiscount = () => {
    const discount = Number(discountValue || 0);

    if (!Number.isFinite(discount) || discount < 0) {
      setError("Chegirma manfiy bo'lmasin.");
      return false;
    }

    if (discountType === "PERCENT" && discount > 100) {
      setError("Foiz chegirma 100% dan oshmasin.");
      return false;
    }

    if (discountType === "AMOUNT" && discount > totals.subtotal) {
      setError("Chegirma subtotaldan oshmasin.");
      return false;
    }

    return true;
  };

  const buildSalePayload = (nextPayments = payments) => ({
    id: activeDraft?.id,
    number: activeDraft?.number,
    createdAt: activeDraft?.createdAt,
    customerId: selectedCustomer?.id || null,
    customerName: selectedCustomer?.name || selectedCustomer?.phone || "",
    agentId: selectedAgent?.id || null,
    agentName: selectedAgent?.name || "",
    warehouseId: selectedWarehouse?.id || null,
    warehouseName: selectedWarehouse?.name || "",
    items: cart,
    discountType,
    discountValue,
    payments: nextPayments
      .map((payment) => ({
        ...payment,
        amount: Number(payment.amount || 0),
      }))
      .filter((payment) => payment.amount > 0 && payment.method !== "DEBT"),
    note,
  });

  const openPayment = () => {
    setError("");

    if (!cart.length) {
      setError("Savatcha bo'sh.");
      return;
    }

    if (!validateDiscount()) {
      return;
    }

    setPayments((current) => {
      const paid = current.reduce((total, payment) => total + Number(payment.amount || 0), 0);

      if (paid > 0) {
        return current;
      }

      return [{ ...emptyPayment(), amount: totals.total }];
    });
    setPaymentOpen(true);
  };

  const completeCurrentSale = () => {
    if (completingRef.current) {
      return;
    }

    completingRef.current = true;
    setError("");

    try {
      const paymentTotal = payments.reduce(
        (total, payment) =>
          payment.method === "DEBT" ? total : total + Number(payment.amount || 0),
        0,
      );

      if (paymentTotal > totals.total) {
        throw new Error("To'lov summasi totaldan oshmasin.");
      }

      if (totals.total - paymentTotal > 0 && !selectedCustomer) {
        throw new Error("Qarz qolsa mijoz tanlanishi shart.");
      }

      const sale = completeSale(buildSalePayload(payments));

      setReceiptSale(sale);
      setCart([]);
      setDiscountType("AMOUNT");
      setDiscountValue("");
      setPayments([emptyPayment()]);
      setActiveDraft(null);
      setNote("");
      setPaymentOpen(false);
      setMobileCartOpen(false);
      setSales(getStoredSales());
      setStock(getStoredWarehouseStock());
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      completingRef.current = false;
    }
  };

  const saveDraft = () => {
    setError("");

    if (!cart.length) {
      setError("Hold uchun savatcha bo'sh bo'lmasin.");
      return;
    }

    try {
      holdSale(buildSalePayload([]));
      setCart([]);
      setDiscountType("AMOUNT");
      setDiscountValue("");
      setNote("");
      setActiveDraft(null);
      setSales(getStoredSales());
      setHoldOpen(true);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const resumeDraft = (sale) => {
    setWarehouseId(sale.warehouseId || warehouses[0]?.id || "");
    setCustomerId(sale.customerId || "");
    setAgentId(sale.agentId || "");
    setCart(sale.items || []);
    setDiscountType(sale.discountType || "AMOUNT");
    setDiscountValue(sale.discountValue || "");
    setNote(sale.note || "");
    setActiveDraft({
      id: sale.id,
      number: sale.number,
      createdAt: sale.createdAt,
    });
    setHoldOpen(false);
  };

  const clearCart = () => {
    if (!cart.length || window.confirm("Savatchani tozalaysizmi?")) {
      setCart([]);
      setDiscountValue("");
      setPayments([emptyPayment()]);
      setActiveDraft(null);
      setError("");
    }
  };

  return (
    <div className="pos-terminal">
      <section className="pos-terminal__controls">
        <Select
          label="Ombor"
          value={warehouseId}
          options={warehouses.map((warehouse) => ({
            value: warehouse.id,
            label: warehouse.name,
          }))}
          onChange={(event) => {
            setWarehouseId(event.target.value);
            setCart([]);
          }}
        />
        <Select
          label="Mijoz"
          value={customerId}
          placeholder="Mijozsiz savdo"
          options={[
            { value: "", label: "Mijozsiz savdo" },
            ...customers.map((customer) => ({
              value: customer.id,
              label: customer.name || customer.phone || customer.id,
            })),
          ]}
          onChange={(event) => {
            setCustomerId(event.target.value);
            setAgentId("");
          }}
        />
        <Select
          label="Agent"
          value={agentId}
          placeholder="Agent tanlanmagan"
          options={[
            { value: "", label: "Agent tanlanmagan" },
            ...agents.map((agent) => ({
              value: agent.id,
              label: agent.name || agent.phone || agent.id,
            })),
          ]}
          onChange={(event) => setAgentId(event.target.value)}
        />
      </section>

      {error && (
        <div className="pos-terminal__error">
          <LiveIcon icon={AlertTriangle} motion="danger-breathe" size={16} />
          {error}
        </div>
      )}

      <div className="pos-terminal__workspace">
        <section className="pos-terminal__products">
          <Card padding="md" className="pos-terminal__search-card">
            <Input
              ref={searchRef}
              value={query}
              leftIcon={<Search size={17} />}
              rightIcon={<Barcode size={17} />}
              placeholder="Mahsulot nomi, SKU yoki barcode..."
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <Select
              value={category}
              placeholder="Barcha kategoriyalar"
              options={[{ value: "", label: "Barcha kategoriyalar" }, ...categories]}
              onChange={(event) => setCategory(event.target.value)}
            />
          </Card>

          <div className="pos-terminal__grid">
            {sellableProducts.map((product) => {
              const stockItem = stockByProduct.get(product.id);
              const available = Number(stockItem?.available || 0);
              const lowStock =
                available > 0 && available <= Number(product.minimumStock || stockItem?.minimumStock || 0);

              return (
                <button
                  key={product.id}
                  type="button"
                  className={[
                    "pos-terminal__product-card",
                    available <= 0 ? "pos-terminal__product-card--disabled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={available <= 0}
                  onClick={() => addToCart(product)}
                >
                  <span className="pos-terminal__product-image">
                    {product.image ? <img src={product.image} alt={product.name} /> : <Package size={24} />}
                  </span>
                  <span className="pos-terminal__product-body">
                    <strong>{product.name}</strong>
                    <small>
                      SKU: {product.sku}
                      {product.barcode ? ` / ${product.barcode}` : ""}
                    </small>
                    <b>
                      {formatSaleMoney(product.salePrice)} so'm / {product.unit}
                    </b>
                  </span>
                  <span className="pos-terminal__product-stock">
                    {available <= 0 ? (
                      <Badge variant="danger">
                        <LiveIcon icon={Ban} motion="danger-breathe" size={13} />
                        OUT OF STOCK
                      </Badge>
                    ) : lowStock ? (
                      <Badge variant="warning">
                        <LiveIcon icon={AlertTriangle} motion="warning-glow" size={13} />
                        {available} {product.unit}
                      </Badge>
                    ) : (
                      <Badge variant="success">
                        {available} {product.unit}
                      </Badge>
                    )}
                  </span>
                </button>
              );
            })}

            {!sellableProducts.length && (
              <Card padding="lg" className="pos-terminal__empty-products">
                <Package size={26} />
                <strong>Mahsulot topilmadi</strong>
                <span>Faol, narxi bor va tanlangan omborda mavjud mahsulotlar chiqadi.</span>
              </Card>
            )}
          </div>
        </section>

        <aside
          className={[
            "pos-terminal__cart",
            mobileCartOpen ? "pos-terminal__cart--open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <CartPanel
            cart={cart}
            totals={totals}
            discountType={discountType}
            discountValue={discountValue}
            note={note}
            onDiscountType={setDiscountType}
            onDiscountValue={setDiscountValue}
            onNote={setNote}
            onIncrease={(item) => changeItemQuantity(item, 1)}
            onDecrease={(item) => changeItemQuantity(item, -1)}
            onQuantity={setItemQuantity}
            onRemove={removeItem}
            onClear={clearCart}
            onHold={saveDraft}
            onOpenHold={() => setHoldOpen(true)}
            onPayment={openPayment}
            onCloseMobile={() => setMobileCartOpen(false)}
          />
        </aside>
      </div>

      <button
        type="button"
        className="pos-terminal__mobile-cart"
        onClick={() => setMobileCartOpen(true)}
      >
        <ReceiptText size={18} />
        Savatcha: {cart.length} / {formatSaleMoney(totals.total)} so'm
      </button>

      <PaymentModal
        open={paymentOpen}
        total={totals.total}
        paid={payments.reduce(
          (sum, payment) =>
            payment.method === "DEBT" ? sum : sum + Number(payment.amount || 0),
          0,
        )}
        payments={payments}
        onClose={() => setPaymentOpen(false)}
        onPayments={setPayments}
        onComplete={completeCurrentSale}
      />

      <Modal
        open={holdOpen}
        title="Kutilayotgan savdolar"
        description="Hold qilingan savdolar stockni kamaytirmaydi."
        size="md"
        onClose={() => setHoldOpen(false)}
      >
        <div className="pos-terminal__drafts">
          {draftSales.length ? (
            draftSales.map((sale) => (
              <button key={sale.id} type="button" onClick={() => resumeDraft(sale)}>
                <span>
                  <strong>{sale.number}</strong>
                  <small>{sale.customerName || "Mijozsiz"} / {sale.items.length} item</small>
                </span>
                <b>{formatSaleMoney(sale.total)} so'm</b>
              </button>
            ))
          ) : (
            <div className="pos-terminal__draft-empty">Kutilayotgan savdo yo'q.</div>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(receiptSale)}
        title="Savdo yakunlandi"
        description="Receipt tayyor. Print qilish mumkin."
        size="sm"
        onClose={() => setReceiptSale(null)}
      >
        <ReceiptPreview sale={receiptSale} onPrint={() => window.print()} />
      </Modal>
    </div>
  );
};

const CartPanel = ({
  cart,
  totals,
  discountType,
  discountValue,
  note,
  onDiscountType,
  onDiscountValue,
  onNote,
  onIncrease,
  onDecrease,
  onQuantity,
  onRemove,
  onClear,
  onHold,
  onOpenHold,
  onPayment,
  onCloseMobile,
}) => (
  <Card padding="md" className="pos-terminal__cart-card">
    <div className="pos-terminal__cart-head">
      <div>
        <h3>Savatcha</h3>
        <span>{cart.length} ta pozitsiya</span>
      </div>
      <button type="button" className="pos-terminal__cart-close" onClick={onCloseMobile}>
        <X size={17} />
      </button>
    </div>

    <div className="pos-terminal__cart-items">
      {cart.length ? (
        cart.map((item) => (
          <div key={item.productId} className="pos-terminal__cart-item">
            <div className="pos-terminal__cart-item-main">
              <strong>{item.productName}</strong>
              <span>
                {formatSaleMoney(item.price)} so'm / {item.unit}
              </span>
            </div>
            <div className="pos-terminal__qty">
              <button type="button" onClick={() => onDecrease(item)} disabled={item.quantity <= 1}>
                <Minus size={14} />
              </button>
              <input
                value={item.quantity}
                onChange={(event) => onQuantity(item.productId, Number(event.target.value))}
              />
              <button type="button" onClick={() => onIncrease(item)}>
                <Plus size={14} />
              </button>
            </div>
            <strong>{formatSaleMoney(item.subtotal)} so'm</strong>
            <button type="button" className="pos-terminal__remove" onClick={() => onRemove(item.productId)}>
              <Trash2 size={15} />
            </button>
          </div>
        ))
      ) : (
        <div className="pos-terminal__empty-cart">
          <ReceiptText size={28} />
          <strong>Savatcha bo'sh</strong>
          <span>Mahsulot kartasini bosing yoki barcode/SKU kiriting.</span>
        </div>
      )}
    </div>

    <div className="pos-terminal__discount">
      <Select
        label="Chegirma"
        value={discountType}
        options={[
          { value: "AMOUNT", label: "Summa" },
          { value: "PERCENT", label: "Foiz" },
        ]}
        onChange={(event) => onDiscountType(event.target.value)}
      />
      <Input
        label="Qiymat"
        value={discountValue}
        inputMode="decimal"
        placeholder="0"
        onChange={(event) => onDiscountValue(event.target.value)}
      />
    </div>

    <Textarea
      label="Izoh"
      value={note}
      rows={2}
      placeholder="Ixtiyoriy"
      onChange={(event) => onNote(event.target.value)}
    />

    <div className="pos-terminal__summary">
      <span>
        Subtotal <b>{formatSaleMoney(totals.subtotal)} so'm</b>
      </span>
      <span>
        Discount <b>-{formatSaleMoney(totals.discount)} so'm</b>
      </span>
      <strong>
        Total <b>{formatSaleMoney(totals.total)} so'm</b>
      </strong>
      <span>
        Paid <b>{formatSaleMoney(totals.paidAmount)} so'm</b>
      </span>
      <span>
        Debt <b>{formatSaleMoney(totals.debtAmount)} so'm</b>
      </span>
    </div>

    <div className="pos-terminal__cart-actions">
      <Button variant="secondary" leftIcon={<PauseCircle size={17} />} onClick={onHold} disabled={!cart.length}>
        Hold
      </Button>
      <Button variant="secondary" leftIcon={<Warehouse size={17} />} onClick={onOpenHold}>
        Resume
      </Button>
      <Button variant="danger" leftIcon={<Trash2 size={17} />} onClick={onClear} disabled={!cart.length}>
        Clear
      </Button>
      <Button leftIcon={<ReceiptText size={17} />} onClick={onPayment} disabled={!cart.length}>
        Payment
      </Button>
    </div>
  </Card>
);

const PaymentModal = ({
  open,
  total,
  paid,
  payments,
  onClose,
  onPayments,
  onComplete,
}) => {
  const debt = Math.max(Number(total || 0) - Number(paid || 0), 0);

  const updatePayment = (id, patch) => {
    onPayments((current) =>
      current.map((payment) => (payment.id === id ? { ...payment, ...patch } : payment)),
    );
  };

  const addPayment = () => {
    onPayments((current) => [...current, emptyPayment()]);
  };

  const removePayment = (id) => {
    onPayments((current) => current.filter((payment) => payment.id !== id));
  };

  return (
    <Modal
      open={open}
      title="To'lov"
      description="Split payment qo'llab-quvvatlanadi. Qarz qolsa customer tanlangan bo'lishi shart."
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor
          </Button>
          <Button onClick={onComplete}>Savdoni yakunlash</Button>
        </>
      }
    >
      <div className="pos-terminal__payment">
        <div className="pos-terminal__payment-summary">
          <span>
            Total <b>{formatSaleMoney(total)} so'm</b>
          </span>
          <span>
            Paid <b>{formatSaleMoney(paid)} so'm</b>
          </span>
          <span>
            Debt <b>{formatSaleMoney(debt)} so'm</b>
          </span>
        </div>

        {payments.map((payment) => (
          <div key={payment.id} className="pos-terminal__payment-row">
            <Select
              value={payment.method}
              options={PAYMENT_METHODS}
              onChange={(event) => updatePayment(payment.id, { method: event.target.value })}
            />
            <Input
              value={payment.amount}
              inputMode="decimal"
              placeholder="0"
              disabled={payment.method === "DEBT"}
              onChange={(event) => updatePayment(payment.id, { amount: event.target.value })}
            />
            <button type="button" onClick={() => removePayment(payment.id)} disabled={payments.length === 1}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        <Button variant="secondary" leftIcon={<Plus size={16} />} onClick={addPayment}>
          To'lov qo'shish
        </Button>
      </div>
    </Modal>
  );
};

export default POSTerminalPage;
