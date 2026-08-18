import StockGrid from "../../components/StockGrid/StockGrid";

import StockInModal from "../../components/StockInModal/StockInModal";
import StockOutModal from "../../components/StockOutModal/StockOutModal";
import TransferModal from "../../components/TransferModal/TransferModal";
import InventoryModal from "../../components/InventoryModal/InventoryModal";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { syncWarehouseWithProducts } from "../../utils/warehouseProductSync";

import WarehouseFormModal from "../../components/WarehouseFormModal/WarehouseFormModal";
import WarehouseManager from "../../components/WarehouseManager/WarehouseManager";

import {
  createWarehouse,
  getStoredWarehouses,
  toggleWarehouseStatus,
  updateWarehouse,
} from "../../utils/warehouseManagementStorage";

import {
  getStoredWarehouseStock,
  getWarehouseMovements,
  inventoryAdjustStock,
  stockIn,
  stockOut,
  transferStock,
} from "../../utils/warehouseStorage";

import StockMovements from "../../components/StockMovements/StockMovements";

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  ClipboardCheck,
  CircleAlert,
  PackageCheck,
  Wallet,
} from "lucide-react";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import {
  Button,
  Card,
  LiveIcon,
  Select,
  TableToolbar,
} from "../../../../shared/ui";
import { translateOptions, translateText } from "../../../../localization/i18n";

import { WAREHOUSES } from "../../constants/warehouseMock";

import {
  formatWarehouseMoney,
  getWarehouseStockStatus,
} from "../../utils/warehouseHelpers";

import "./WarehousePage.scss";

const WarehousePage = () => {
  const [stock, setStock] = useState(() => getStoredWarehouseStock());

  const [movements, setMovements] = useState(() => getWarehouseMovements());

  const refreshWarehouseData = () => {
    setStock(syncWarehouseWithProducts());

    setMovements(getWarehouseMovements());

    setWarehouses(getStoredWarehouses());
  };

  const navigate = useNavigate();

  const [warehouseId, setWarehouseId] = useState("wh-main");

  const [search, setSearch] = useState("");

  const [stockStatusFilter, setStockStatusFilter] = useState("");

  const [typeFilter, setTypeFilter] = useState("");

  const [transferOpen, setTransferOpen] = useState(false);

  const [warehouses, setWarehouses] = useState(() => getStoredWarehouses());

  const [warehouseFormOpen, setWarehouseFormOpen] = useState(false);

  const [editingWarehouse, setEditingWarehouse] = useState(null);

  const warehouseOptions = warehouses
    .filter((warehouse) => warehouse.status === "ACTIVE")
    .map((warehouse) => ({
      value: warehouse.id,
      label: warehouse.name,
    }));

  const [inventoryOpen, setInventoryOpen] = useState(false);

  const [stockInOpen, setStockInOpen] = useState(false);

  const [stockOutOpen, setStockOutOpen] = useState(false);

  useEffect(() => {
    const currentWarehouse = warehouses.find(
      (warehouse) =>
        warehouse.id === warehouseId && warehouse.status === "ACTIVE",
    );

    if (currentWarehouse) {
      return;
    }

    const firstActive = warehouses.find(
      (warehouse) => warehouse.status === "ACTIVE",
    );

    if (firstActive) {
      setWarehouseId(firstActive.id);
    }
  }, [warehouses, warehouseId]);

  const handleStockIn = async (values) => {
    try {
      await stockIn(values);

      setStockInOpen(false);

      refreshWarehouseData();
    } catch (error) {
      alert(translateText(error.message || "Kirim qilishda xatolik yuz berdi."));
    }
  };

  const handleInventory = async (values) => {
    try {
      await inventoryAdjustStock(values);

      setInventoryOpen(false);

      refreshWarehouseData();
    } catch (error) {
      alert(
        translateText(error.message || "Inventarizatsiyada xatolik yuz berdi."),
      );
    }
  };

  const warehouseMovements = useMemo(() => {
    return movements.filter((movement) => movement.warehouseId === warehouseId);
  }, [movements, warehouseId]);

  const handleStockOut = async (values) => {
    try {
      await stockOut(values);

      setStockOutOpen(false);

      refreshWarehouseData();
    } catch (error) {
      alert(translateText(error.message || "Chiqim qilishda xatolik yuz berdi."));
    }
  };

  const handleTransfer = async (values) => {
    try {
      await transferStock(values);

      setTransferOpen(false);

      refreshWarehouseData();
    } catch (error) {
      alert(translateText(error.message || "Ko‘chirishda xatolik yuz berdi."));
    }
  };

  const filteredStock = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return stock.filter((item) => {
      const matchesWarehouse = item.warehouseId === warehouseId;

      const matchesSearch =
        !normalizedSearch ||
        item.productName.toLowerCase().includes(normalizedSearch) ||
        item.sku?.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        !stockStatusFilter ||
        getWarehouseStockStatus(item) === stockStatusFilter;

      const matchesType = !typeFilter || item.type === typeFilter;

      return matchesWarehouse && matchesSearch && matchesStatus && matchesType;
    });
  }, [stock, warehouseId, search, stockStatusFilter, typeFilter]);

  const stats = useMemo(() => {
    const warehouseStock = stock.filter(
      (item) => item.warehouseId === warehouseId,
    );

    const totalValue = warehouseStock.reduce(
      (total, item) => total + item.quantity * item.cost,
      0,
    );

    const lowStock = warehouseStock.filter(
      (item) => getWarehouseStockStatus(item) === "LOW_STOCK",
    ).length;

    const outOfStock = warehouseStock.filter(
      (item) => getWarehouseStockStatus(item) === "OUT_OF_STOCK",
    ).length;

    return {
      products: warehouseStock.length,

      totalValue,
      lowStock,
      outOfStock,
    };
  }, [stock, warehouseId]);

  const selectedWarehouse = warehouses.find(
    (warehouse) => warehouse.id === warehouseId,
  );

  const refreshWarehouses = () => {
    setWarehouses(getStoredWarehouses());
  };

  const handleSaveWarehouse = async (values) => {
    if (editingWarehouse) {
      updateWarehouse({
        ...editingWarehouse,
        ...values,
      });
    } else {
      await createWarehouse(values);
    }

    setWarehouseFormOpen(false);
    setEditingWarehouse(null);

    refreshWarehouses();
  };

  const handleEditWarehouse = (warehouse) => {
    setEditingWarehouse(warehouse);

    setWarehouseFormOpen(true);
  };

  const handleToggleWarehouse = (warehouse) => {
    toggleWarehouseStatus(warehouse.id);

    refreshWarehouses();
  };

  useEffect(() => {
    const syncedStock = syncWarehouseWithProducts();

    setStock(syncedStock);
  }, []);

  return (
    <PageContainer
      title={translateText("Ombor")}
      description={translateText(
        "Mahsulot qoldiqlari, kirim-chiqim va ombor operatsiyalarini boshqarish.",
      )}
    >
      <div className="warehouse-page">
        <section className="warehouse-page__top">
          <div className="warehouse-page__selector">
            <span>{translateText("Joriy ombor")}</span>

            <Select
              value={warehouseId}
              options={warehouseOptions}
              onChange={(event) => setWarehouseId(event.target.value)}
            />
          </div>

          <div className="warehouse-page__quick-actions">
            <Button
              leftIcon={<ArrowDownToLine size={17} />}
              onClick={() => setStockInOpen(true)}
            >
              {translateText("Kirim")}
            </Button>

            <Button
              variant="secondary"
              leftIcon={<ArrowUpFromLine size={17} />}
              onClick={() => setStockOutOpen(true)}
            >
              {translateText("Chiqim")}
            </Button>

            <Button
              variant="secondary"
              leftIcon={<ArrowLeftRight size={17} />}
              onClick={() => setTransferOpen(true)}
            >
              {translateText("Ko‘chirish")}
            </Button>

            <Button
              variant="secondary"
              leftIcon={<ClipboardCheck size={17} />}
              onClick={() => setInventoryOpen(true)}
            >
              {translateText("Inventarizatsiya")}
            </Button>
          </div>
        </section>

        <section className="warehouse-page__stats">
          <WarehouseStat
            icon={<Boxes size={21} />}
            label={translateText("Mahsulotlar")}
            value={stats.products}
          />

          <WarehouseStat
            icon={<Wallet size={21} />}
            label={translateText("Ombor qiymati")}
            value={`${formatWarehouseMoney(stats.totalValue)} ${translateText("so‘m")}`}
          />

          <WarehouseStat
            icon={
              <LiveIcon
                icon={CircleAlert}
                motion="warning-glow"
                active={stats.lowStock > 0}
                size={21}
              />
            }
            label={translateText("Kam qolgan")}
            value={stats.lowStock}
            variant="warning"
          />

          <WarehouseStat
            icon={
              <LiveIcon
                icon={PackageCheck}
                motion="danger-breathe"
                active={stats.outOfStock > 0}
                size={21}
              />
            }
            label={translateText("Tugagan")}
            value={stats.outOfStock}
            variant="danger"
          />
        </section>

        <WarehouseManager
          warehouses={warehouses}
          onCreate={() => {
            setEditingWarehouse(null);
            setWarehouseFormOpen(true);
          }}
          onEdit={handleEditWarehouse}
          onToggleStatus={handleToggleWarehouse}
        />
        <Card padding="md" className="warehouse-page__workspace">
          <div className="warehouse-page__workspace-header">
            <div>
              <h2>{selectedWarehouse?.name}</h2>

              <p>{translateText("Joriy qoldiq va mavjud mahsulotlar.")}</p>
            </div>
          </div>

          <div className="warehouse-page__toolbar">
            <TableToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder={translateText(
                "Mahsulot yoki SKU bo‘yicha qidirish...",
              )}
            >
              <div className="warehouse-page__filter">
                <Select
                  value={typeFilter}
                  placeholder={translateText("Barcha turlar")}
                  options={translateOptions([
                    {
                      value: "RAW_MATERIAL",
                      label: "Xomashyo",
                    },
                    {
                      value: "SEMI_FINISHED",
                      label: "Yarim tayyor",
                    },
                    {
                      value: "FINISHED_GOOD",
                      label: "Tayyor mahsulot",
                    },
                    {
                      value: "TRADING_PRODUCT",
                      label: "Savdo mahsuloti",
                    },
                  ])}
                  onChange={(event) => setTypeFilter(event.target.value)}
                />
              </div>

              <div className="warehouse-page__filter">
                <Select
                  value={stockStatusFilter}
                  placeholder={translateText("Barcha qoldiq")}
                  options={translateOptions([
                    {
                      value: "IN_STOCK",
                      label: "Yetarli",
                    },
                    {
                      value: "LOW_STOCK",
                      label: "Kam qolgan",
                    },
                    {
                      value: "OUT_OF_STOCK",
                      label: "Tugagan",
                    },
                  ])}
                  onChange={(event) => setStockStatusFilter(event.target.value)}
                />
              </div>

              {(typeFilter || stockStatusFilter) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setTypeFilter("");
                    setStockStatusFilter("");
                  }}
                >
                  {translateText("Filtrlarni tozalash")}
                </Button>
              )}
            </TableToolbar>
          </div>

          <div className="warehouse-page__result">
            {filteredStock.length} {translateText("ta mahsulot")}
          </div>

          <StockGrid
            items={filteredStock}
            onView={(item) =>
              navigate(
                `/warehouse/${item.warehouseId}/product/${item.productId}`,
              )
            }
          />
        </Card>
        <StockMovements
          movements={warehouseMovements}
          warehouses={warehouses}
        />
      </div>
      <StockInModal
        open={stockInOpen}
        warehouseId={warehouseId}
        stock={stock}
        onClose={() => setStockInOpen(false)}
        onSubmit={handleStockIn}
      />
      <StockOutModal
        open={stockOutOpen}
        warehouseId={warehouseId}
        stock={stock}
        onClose={() => setStockOutOpen(false)}
        onSubmit={handleStockOut}
      />
      <TransferModal
        open={transferOpen}
        currentWarehouseId={warehouseId}
        stock={stock}
        onClose={() => setTransferOpen(false)}
        onSubmit={handleTransfer}
      />
      <InventoryModal
        open={inventoryOpen}
        warehouseId={warehouseId}
        stock={stock}
        onClose={() => setInventoryOpen(false)}
        onSubmit={handleInventory}
      />
      <WarehouseFormModal
        open={warehouseFormOpen}
        warehouse={editingWarehouse}
        onClose={() => {
          setWarehouseFormOpen(false);
          setEditingWarehouse(null);
        }}
        onSubmit={handleSaveWarehouse}
      />
    </PageContainer>
  );
};

const WarehouseStat = ({ icon, label, value, variant }) => {
  return (
    <Card variant="soft" padding="md" className="warehouse-page__stat">
      <div
        className={[
          "warehouse-page__stat-icon",

          variant ? `warehouse-page__stat-icon--${variant}` : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {icon}
      </div>

      <div>
        <span>{label}</span>

        <strong>{value}</strong>
      </div>
    </Card>
  );
};

export default WarehousePage;
