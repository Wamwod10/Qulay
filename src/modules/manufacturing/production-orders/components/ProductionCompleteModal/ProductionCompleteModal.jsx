import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Search, Trash2 } from "lucide-react";

import { translateText } from "../../../../../localization/i18n";
import { apiRequest, unwrapList } from "../../../../../services/api/apiClient";
import {
  Button,
  Input,
  LiveIcon,
  Modal,
  Textarea,
} from "../../../../../shared/ui";
import { convertQuantity, normalizeUnit } from "../../../../../shared/utils/units";
import { saveWarehouseStock } from "../../../../warehouse/utils/warehouseStorage";
import { formatManufacturingMoney } from "../../../utils/manufacturingHelpers";
import {
  calculateActualProductionCost,
  calculateActualUnitCost,
  calculateOverheadCost,
} from "../../../utils/productionCost";

import "./ProductionCompleteModal.scss";

const ProductionCompleteModal = ({ open, order, onClose, onSubmit }) => {
  const [products, setProducts] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [producedQuantity, setProducedQuantity] = useState("");
  const [acceptedQuantity, setAcceptedQuantity] = useState("");
  const [defectQuantity, setDefectQuantity] = useState("0");
  const [wasteQuantity, setWasteQuantity] = useState("0");
  const [actualMaterials, setActualMaterials] = useState([]);
  const [packagingRows, setPackagingRows] = useState([]);
  const [completionNote, setCompletionNote] = useState("");
  const [error, setError] = useState("");
  const [packagingLoadError, setPackagingLoadError] = useState("");
  const [packagingLoading, setPackagingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activePackagingIndex, setActivePackagingIndex] = useState(null);

  useEffect(() => {
    if (!open || !order) return undefined;

    let cancelled = false;
    setPackagingLoading(true);
    setPackagingLoadError("");

    Promise.all([
      apiRequest("/products?status=ACTIVE&type=FINISHED_GOOD&limit=500", { skipCache: true }),
      apiRequest(
        order.outputWarehouseId
          ? `/inventory/stock?warehouseId=${encodeURIComponent(order.outputWarehouseId)}`
          : "/inventory/stock",
        { skipCache: true },
      ),
    ])
      .then(([productsResult, stockResult]) => {
        if (cancelled) return;

        const remoteProducts = unwrapList(productsResult, ["products"]);
        const remoteStock = unwrapList(stockResult, ["stock"]);

        if (!Array.isArray(remoteProducts) || !Array.isArray(remoteStock)) {
          throw new Error("Qadoqlash mahsulotlari backenddan olinmadi.");
        }

        setProducts(remoteProducts);
        setStockItems(remoteStock);
        saveWarehouseStock(remoteStock);
        window.dispatchEvent(new Event("warehouse:changed"));
      })
      .catch((loadError) => {
        if (cancelled) return;
        setProducts([]);
        setStockItems([]);
        setPackagingLoadError(loadError?.message || "Qadoqlash mahsulotlari backenddan olinmadi.");
      })
      .finally(() => {
        if (!cancelled) setPackagingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, order]);

  const stockByProduct = useMemo(() => {
    const map = new Map();

    stockItems.forEach((item) => {
      const productId = item.productId;
      if (!productId) return;

      const current = map.get(productId) || { available: 0, quantity: 0, reserved: 0, cost: null };
      const quantity = Number(item.quantity || 0);
      const reserved = Number(item.reserved || 0);
      const available = Number(item.available ?? Math.max(quantity - reserved, 0));
      const cost = item.cost === null || item.cost === undefined ? current.cost : Number(item.cost);

      map.set(productId, {
        available: current.available + available,
        quantity: current.quantity + quantity,
        reserved: current.reserved + reserved,
        cost: cost === null || Number.isNaN(cost) ? current.cost : cost,
      });
    });

    return map;
  }, [stockItems]);

  const packagedProductOptions = useMemo(
    () => products.filter((product) => {
      try {
        const stock = stockByProduct.get(product.id);
        return (
          product.status === "ACTIVE" &&
          product.type === "FINISHED_GOOD" &&
          normalizeUnit(product.unit) === "dona" &&
          Number(stock?.available ?? product.stock ?? 0) > 0
        );
      } catch {
        return false;
      }
    }).map((product) => {
      const stock = stockByProduct.get(product.id);
      return {
        ...product,
        available: Number(stock?.available ?? product.stock ?? 0),
        cost: Number(product.cost ?? stock?.cost ?? 0),
        stockCost: Number(stock?.cost ?? product.cost ?? 0),
      };
    }),
    [products, stockByProduct],
  );
  const packagingDatalistId = `packaging-products-${order?.id || "new"}`;

  const getPackagingProduct = (row) =>
    packagedProductOptions.find((product) => product.id === row.productId) || null;

  const getProductSearchLabel = (product) => {
    if (!product) return "";
    return [product.name, product.sku ? `SKU: ${product.sku}` : "", product.barcode ? `Barcode: ${product.barcode}` : ""]
      .filter(Boolean)
      .join(" | ");
  };

  const getProductSearchValue = (product) =>
    [
      product?.name,
      product?.sku,
      product?.barcode,
      getProductSearchLabel(product),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();

  const getPackagingMatches = (value) => {
    const normalized = String(value || "").trim().toLocaleLowerCase();
    if (!normalized) return packagedProductOptions.slice(0, 20);

    return packagedProductOptions
      .filter((product) => getProductSearchValue(product).includes(normalized))
      .slice(0, 20);
  };

  const findPackagedProduct = (value) => {
    const normalized = String(value || "").trim().toLocaleLowerCase();
    if (!normalized) return null;
    return packagedProductOptions.find((product) => {
      const label = getProductSearchLabel(product).toLocaleLowerCase();
      return (
        product.id === value ||
        String(product.name || "").toLocaleLowerCase() === normalized ||
        String(product.sku || "").toLocaleLowerCase() === normalized ||
        String(product.barcode || "").toLocaleLowerCase() === normalized ||
        label === normalized
      );
    }) || null;
  };

  const selectPackagingProduct = (index, product) => {
    setPackagingRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;

      const plannedQuantity = getPlannedPackQuantity({
        ...row,
        productId: product.id,
        packSize: product.packSize || row.packSize,
        packUnit: product.packUnit || row.packUnit || order.unit,
      });

      return {
        ...row,
        searchText: getProductSearchLabel(product),
        productId: product.id,
        productName: product.name,
        sku: product.sku || "",
        barcode: product.barcode || "",
        cost: Number(product.cost ?? product.stockCost ?? 0),
        packSize: product.packSize || row.packSize,
        packUnit: product.packUnit || row.packUnit || order.unit,
        quantity: row.quantity || (plannedQuantity > 0 ? String(plannedQuantity) : ""),
      };
    }));
    setActivePackagingIndex(null);
  };

  const getRowPackSize = (row) => {
    const product = getPackagingProduct(row);
    const productPackSize = Number(product?.packSize || 0);
    return productPackSize > 0 ? productPackSize : Number(row.packSize || 0);
  };

  const getRowPackUnit = (row) => {
    const product = getPackagingProduct(row);
    return product?.packUnit || row.packUnit || order.unit;
  };

  const getPlannedPackQuantity = (row) => {
    const snapshotQuantity = Number(row.plannedQuantity ?? row.recipeQuantity ?? 0);
    if (snapshotQuantity > 0) return Math.floor(snapshotQuantity);
    const packSize = getRowPackSize(row);
    if (packSize <= 0 || Number(order.plannedQuantity || 0) <= 0) return 0;
    try {
      const normalizedPackSize = convertQuantity(packSize, getRowPackUnit(row), order.unit);
      return normalizedPackSize > 0 ? Math.floor(Number(order.plannedQuantity || 0) / normalizedPackSize) : 0;
    } catch {
      return 0;
    }
  };

  const getPackagingMaterialCost = (row) =>
    (row.materials || []).reduce(
      (rowTotal, material) => rowTotal + Number(material.quantity || 0) * Number(row.quantity || 0) * Number(products.find((product) => product.id === material.productId)?.cost || 0),
      0,
    );

  useEffect(() => {
    if (!open || !order) return;
    const qc = order.qualityControl || {};
    const produced = qc.producedQuantity ?? order.producedQuantity ?? order.plannedQuantity ?? 0;
    const accepted = qc.acceptedQuantity ?? order.acceptedQuantity ?? produced;
    setProducedQuantity(String(produced));
    setAcceptedQuantity(String(accepted));
    setDefectQuantity(String(qc.defectQuantity ?? order.defectQuantity ?? 0));
    setWasteQuantity(String(qc.wasteQuantity ?? order.wasteQuantity ?? 0));
    setActualMaterials((order.requiredMaterials || []).map((material) => ({
      productId: material.productId,
      productName: material.productName,
      unit: material.unit,
      plannedQuantity: Number(material.requiredQuantity || material.plannedQuantity || 0),
      actualQuantity: Number(material.actualQuantity || material.requiredQuantity || material.plannedQuantity || 0),
      cost: Number(material.cost || 0),
    })));
    setPackagingRows(Array.isArray(order.packaging) ? order.packaging : []);
    setCompletionNote("");
    setError("");
  }, [open, order]);

  if (!order) return null;

  const produced = Number(producedQuantity || 0);
  const accepted = Number(acceptedQuantity || 0);
  const defect = Number(defectQuantity || 0);
  const waste = Number(wasteQuantity || 0);
  const packagingTotal = packagingRows.reduce((total, row) => {
    try {
      return total + Number(row.quantity || 0) * convertQuantity(getRowPackSize(row), getRowPackUnit(row), order.unit);
    } catch {
      return total;
    }
  }, 0);
  const remainingBulk = Math.max(accepted - packagingTotal, 0);
  const rawMaterialCost = actualMaterials.reduce((total, material) => total + Number(material.actualQuantity || 0) * Number(material.cost || 0), 0);
  const packagingPreviewCost = packagingRows.reduce(
    (total, row) => total + getPackagingMaterialCost(row),
    0,
  );
  const overheadCost = calculateOverheadCost(order.overheadItems);
  const actualProductionCost = calculateActualProductionCost({
    actualMaterialCost: rawMaterialCost + packagingPreviewCost,
    overheadCost,
  });
  const actualUnitCost = calculateActualUnitCost({
    actualProductionCost,
    producedQuantity: accepted,
  });
  const baseUnitCost = calculateActualUnitCost({
    actualProductionCost: rawMaterialCost + overheadCost,
    producedQuantity: accepted,
  });
  const planDifference = accepted - Number(order.plannedQuantity || 0);
  const packagingPlannedTotal = packagingRows.reduce((total, row) => total + getPlannedPackQuantity(row), 0);
  const packagingActualTotal = packagingRows.reduce((total, row) => total + Number(row.quantity || 0), 0);
  const packagingDifferenceTotal = packagingActualTotal - packagingPlannedTotal;

  const updateMaterial = (productId, value) => {
    setActualMaterials((current) => current.map((material) => material.productId === productId ? { ...material, actualQuantity: value } : material));
  };
  const updatePackaging = (index, key, value) => setPackagingRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  const handlePackagingProductSearch = (index, value) => {
    const product = findPackagedProduct(value);
    if (product) {
      selectPackagingProduct(index, product);
      return;
    }

    setPackagingRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      return { ...row, searchText: value, productId: "", productName: "", sku: "", barcode: "", cost: 0 };
    }));
  };
  const addPackaging = () => setPackagingRows((current) => [...current, { productName: "", productId: "", searchText: "", quantity: "", packSize: "", packUnit: order.unit, materials: [] }]);
  const removePackaging = (index) => setPackagingRows((current) => current.filter((_, rowIndex) => rowIndex !== index));

  const getPackagingUnitCost = (row) => {
    const packSize = getRowPackSize(row);
    let normalizedPackSize = 0;
    try {
      normalizedPackSize = convertQuantity(packSize, getRowPackUnit(row), order.unit);
    } catch {
      normalizedPackSize = Number(packSize || 0);
    }
    const perPackPackagingCost = Number(row.quantity || 0) > 0 ? getPackagingMaterialCost(row) / Number(row.quantity || 0) : 0;
    return (baseUnitCost * normalizedPackSize) + perPackPackagingCost;
  };

  const handleSubmit = async () => {
    setError("");
    if ([produced, accepted, defect, waste].some((value) => !Number.isFinite(value) || value < 0)) {
      setError("Miqdorlar manfiy bo'lishi mumkin emas.");
      return;
    }
    if (packagingTotal > accepted) {
      setError("Qadoqlangan jami miqdor mavjud mahsulotdan oshmoqda.");
      return;
    }
    if (actualMaterials.some((material) => !Number.isFinite(Number(material.actualQuantity)) || Number(material.actualQuantity) < 0)) {
      setError("Xomashyo sarfi manfiy bo'lishi mumkin emas.");
      return;
    }
    if (packagingRows.some((row) => !row.productId)) {
      setError("Qadoqlash uchun real mahsulotni nomi, SKU yoki shtrix-kodi orqali tanlang.");
      return;
    }
    if (packagingRows.some((row) => !Number.isInteger(Number(row.quantity)) || Number(row.quantity) <= 0 || getRowPackSize(row) <= 0)) {
      setError("Haqiqiy qadoq soni butun son bo'lishi, mahsulotda qadoq hajmi saqlangan bo'lishi kerak.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit?.({
        producedQuantity: produced,
        acceptedQuantity: accepted,
        defectQuantity: defect,
        wasteQuantity: waste,
        overheadCost,
        actualMaterials: actualMaterials.map((material) => ({
          productId: material.productId,
          actualQuantity: Number(material.actualQuantity || 0),
          unit: material.unit,
        })),
        packaging: packagingRows.map((row) => {
          const product = getPackagingProduct(row);
          return ({
          ...row,
          productId: product?.id || row.productId,
          productName: product?.name || row.productName,
          sku: product?.sku || row.sku || "",
          barcode: product?.barcode || row.barcode || "",
          cost: Number(product?.cost ?? row.cost ?? 0),
          unit: "dona",
          packUnit: normalizeUnit(getRowPackUnit(row)),
          quantity: Number(row.quantity || 0),
          packSize: Number(getRowPackSize(row) || 0),
        });
        }),
        outputWarehouseId: order.outputWarehouseId,
        materialWarehouseId: order.materialWarehouseId,
        completionNote,
      });
    } catch (submitError) {
      setError(submitError?.message || "Ishlab chiqarishni yakunlashda xatolik.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={translateText("Ishlab chiqarishni yakunlash")}
      description={`${order.number} - ${order.productName}`}
      size="lg"
    >
      <div className="production-complete">
        <div className="production-complete__summary">
          <div><span>Reja</span><strong>{order.plannedQuantity} {order.unit}</strong></div>
          <div><span>Accepted</span><strong>{accepted} {order.unit}</strong></div>
          <div>
            <span>Farq</span>
            <strong className={planDifference < 0 ? "production-complete__negative" : planDifference > 0 ? "production-complete__positive" : ""}>
              {planDifference > 0 ? "+" : ""}{planDifference} {order.unit}
            </strong>
          </div>
        </div>

        <div className="production-complete__result-grid">
          <Input label={`Produced (${order.unit})`} type="number" min="0" step="any" value={producedQuantity} onChange={(event) => setProducedQuantity(event.target.value)} />
          <Input label={`Accepted (${order.unit})`} type="number" min="0" step="any" value={acceptedQuantity} onChange={(event) => setAcceptedQuantity(event.target.value)} />
          <Input label={`Defect (${order.unit})`} type="number" min="0" step="any" value={defectQuantity} onChange={(event) => setDefectQuantity(event.target.value)} />
          <Input label={`Waste (${order.unit})`} type="number" min="0" step="any" value={wasteQuantity} onChange={(event) => setWasteQuantity(event.target.value)} />
        </div>

        <div className="production-complete__packaging">
          <div className="production-complete__materials-title">
            <div>
              <h4>Qadoqlash</h4>
              <p>Mahsulot nomi, SKU yoki shtrix-kod bilan real tayyor SKU tanlanadi. Qolgan bulk: {remainingBulk} {order.unit}.</p>
            </div>
            <Button type="button" variant="secondary" onClick={addPackaging} leftIcon={<Plus size={15} />}>Qadoq qo'shish</Button>
          </div>
          <datalist id={packagingDatalistId}>
            {packagedProductOptions.map((product) => (
              <option key={product.id} value={getProductSearchLabel(product)} />
            ))}
          </datalist>
          {packagingLoadError && <div className="production-complete__error">{packagingLoadError}</div>}
          {packagingRows.map((row, index) => (
            <div className="production-complete__package-row" key={row.id || index}>
              <div className="production-complete__package-product">
                <Input
                  label="Mahsulot"
                  placeholder={packagingLoading ? "Yuklanmoqda..." : "Mahsulot nomi yoki shtrix-kod..."}
                  value={row.searchText ?? getProductSearchLabel(getPackagingProduct(row)) ?? row.productName ?? ""}
                  list={packagingDatalistId}
                  rightIcon={<Search size={15} />}
                  disabled={packagingLoading}
                  autoComplete="off"
                  onFocus={() => setActivePackagingIndex(index)}
                  onBlur={() => window.setTimeout(() => setActivePackagingIndex(null), 120)}
                  onChange={(event) => {
                    setActivePackagingIndex(index);
                    handlePackagingProductSearch(index, event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    const match = getPackagingMatches(event.currentTarget.value).at(0);
                    if (match) {
                      event.preventDefault();
                      selectPackagingProduct(index, match);
                    }
                  }}
                />
                {activePackagingIndex === index && (
                  <div className="production-complete__package-dropdown">
                    {getPackagingMatches(row.searchText ?? "").length ? (
                      getPackagingMatches(row.searchText ?? "").map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectPackagingProduct(index, product)}
                        >
                          <span>
                            <strong>{product.name}</strong>
                            <small>
                              SKU: {product.sku || "-"} / Barcode: {product.barcode || "-"}
                            </small>
                          </span>
                          <b>{product.available} dona</b>
                        </button>
                      ))
                    ) : (
                      <div>{packagingLoading ? "Yuklanmoqda..." : "Mos mahsulot topilmadi"}</div>
                    )}
                  </div>
                )}
              </div>
              <div className="production-complete__package-cost">
                <span>Tannarx</span>
                <strong>{formatManufacturingMoney(row.cost ?? getPackagingProduct(row)?.cost ?? getPackagingUnitCost(row))} / dona</strong>
              </div>
              <div className="production-complete__package-qty">
                <div>
                  <span>Retsept bo'yicha</span>
                  <strong>{getPlannedPackQuantity(row)} dona</strong>
                </div>
                <Input
                  label="Haqiqiy"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={row.quantity || ""}
                  onChange={(event) => updatePackaging(index, "quantity", event.target.value)}
                />
                <div>
                  <span>Farq</span>
                  <strong className={Number(row.quantity || 0) - getPlannedPackQuantity(row) < 0 ? "production-complete__negative" : Number(row.quantity || 0) - getPlannedPackQuantity(row) > 0 ? "production-complete__positive" : ""}>
                    {Number(row.quantity || 0) - getPlannedPackQuantity(row) > 0 ? "+" : ""}{Number(row.quantity || 0) - getPlannedPackQuantity(row)} dona
                  </strong>
                </div>
              </div>
              <Button type="button" variant="ghost" aria-label="Qadoqni o'chirish" title="Qadoqni o'chirish" className="production-complete__package-delete" onClick={() => removePackaging(index)}>
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          <div className="production-complete__packaging-summary">
            <strong>Qadoqlash summary</strong>
            {packagingRows.map((row, index) => {
              const product = getPackagingProduct(row);
              const planned = getPlannedPackQuantity(row);
              const actual = Number(row.quantity || 0);
              return (
                <div key={row.id || `summary-${index}`}>
                  <span>{product?.name || row.productName || "Mahsulot tanlanmagan"}</span>
                  <strong>Retsept: {planned} dona</strong>
                  <strong>Haqiqiy: {actual} dona</strong>
                  <strong className={actual - planned < 0 ? "production-complete__negative" : actual - planned > 0 ? "production-complete__positive" : ""}>
                    Farq: {actual - planned > 0 ? "+" : ""}{actual - planned} dona
                  </strong>
                </div>
              );
            })}
            <div className="production-complete__packaging-total">
              <span>Retsept bo'yicha jami: <strong>{packagingPlannedTotal} dona</strong></span>
              <span>Haqiqiy jami: <strong>{packagingActualTotal} dona</strong></span>
              <span>Farq: <strong className={packagingDifferenceTotal < 0 ? "production-complete__negative" : packagingDifferenceTotal > 0 ? "production-complete__positive" : ""}>{packagingDifferenceTotal > 0 ? "+" : ""}{packagingDifferenceTotal} dona</strong></span>
            </div>
          </div>
        </div>

        <div className="production-complete__materials">
          <div className="production-complete__materials-header">
            <span>Xomashyo</span><span>Reja</span><span>Real sarf</span><span>Farq</span>
          </div>
          {actualMaterials.map((material) => {
            const difference = Number(material.actualQuantity || 0) - Number(material.plannedQuantity || 0);
            const differencePercent = Number(material.plannedQuantity || 0) > 0 ? (difference / Number(material.plannedQuantity)) * 100 : 0;
            return (
              <div key={material.productId} className="production-complete__material">
                <div><strong>{material.productName}</strong><span>{formatManufacturingMoney(material.cost)} / {material.unit}</span></div>
                <span>{Number(material.plannedQuantity).toFixed(2)} {material.unit}</span>
                <Input type="number" min="0" step="any" value={material.actualQuantity} onChange={(event) => updateMaterial(material.productId, event.target.value)} />
                <strong className={difference > 0 ? "production-complete__negative" : difference < 0 ? "production-complete__positive" : ""}>
                  {difference > 0 ? "+" : ""}{difference.toFixed(2)} {material.unit} ({differencePercent > 0 ? "+" : ""}{differencePercent.toFixed(2)}%)
                </strong>
              </div>
            );
          })}
        </div>

        <div className="production-complete__cost">
          <div><span>Xomashyo</span><strong>{formatManufacturingMoney(rawMaterialCost)}</strong></div>
          <div><span>Qadoqlash materiali</span><strong>{formatManufacturingMoney(packagingPreviewCost)}</strong></div>
          <div><span>Qo'shimcha xarajat</span><strong>{formatManufacturingMoney(overheadCost)}</strong></div>
          <div><span>Jami real tannarx</span><strong>{formatManufacturingMoney(actualProductionCost)}</strong></div>
          <div><span>1 birlik real tannarx</span><strong>{formatManufacturingMoney(actualUnitCost)}</strong></div>
        </div>

        {accepted < Number(order.plannedQuantity || 0) && (
          <div className="production-complete__warning">
            <LiveIcon icon={AlertTriangle} motion="warning-glow" size={17} />
            Rejalashtirilgandan kam yaroqli mahsulot.
          </div>
        )}
        {accepted === Number(order.plannedQuantity || 0) && (
          <div className="production-complete__success">
            <LiveIcon icon={CheckCircle2} motion="success-pop" size={17} />
            Ishlab chiqarish rejasi to'liq bajarilgan.
          </div>
        )}

        <Textarea label="Yakuniy izoh" value={completionNote} placeholder="Masalan: ishlab chiqarish muvaffaqiyatli yakunlandi..." onChange={(event) => setCompletionNote(event.target.value)} />
        {error && <div className="production-complete__error">{translateText(error)}</div>}

        <div className="production-complete__actions">
          <Button variant="secondary" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handleSubmit} loading={submitting}>Ishlab chiqarishni yakunlash</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProductionCompleteModal;
