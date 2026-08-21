import { useEffect, useMemo, useState } from "react";

import { CheckCircle2, Clock3, Plus, ReceiptText, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";
import { translateText } from "../../../../localization/i18n";
import {
  Card,
  ConfirmDialog,
  EmptyState,
  LiveIcon,
  Select,
  Skeleton,
  TableToolbar,
  Toast,
} from "../../../../shared/ui";

import PurchasePaymentModal from "../../components/PurchasePaymentModal/PurchasePaymentModal";
import PurchaseReceiveModal from "../../components/PurchaseReceiveModal/PurchaseReceiveModal";
import PurchaseTable from "../../components/PurchaseTable/PurchaseTable";
import { PURCHASE_STATUS_OPTIONS } from "../../constants/purchasesMock";
import {
  cancelPurchase,
  fetchStoredPurchases,
  getStoredPurchases,
  updatePurchasePayment,
} from "../../utils/purchasesStorage";
import { receivePurchaseIntoWarehouse } from "../../utils/receivePurchase";
import { formatPurchaseMoney } from "../../utils/purchaseHelpers";

import "./PurchasesPage.scss";

const PAGE_SIZE = 10;

const getTodayIso = () => new Date().toISOString().slice(0, 10);

const getPurchaseQuery = ({ search, statusFilter, supplierFilter }) => ({
  search,
  status: statusFilter,
  supplierId: supplierFilter,
});

const PurchasesPage = () => {
  const navigate = useNavigate();

  const [purchases, setPurchases] = useState(() => getStoredPurchases());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [quickFilter, setQuickFilter] = useState("");
  const [page, setPage] = useState(1);
  const [paymentPurchase, setPaymentPurchase] = useState(null);
  const [receivePurchase, setReceivePurchase] = useState(null);
  const [cancelPurchaseItem, setCancelPurchaseItem] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const refreshPurchases = async (
    query = getPurchaseQuery({ search, statusFilter, supplierFilter }),
  ) => {
    setLoadError("");

    try {
      const items = await fetchStoredPurchases(query);
      setPurchases(items);
      return items;
    } catch (error) {
      const cached = getStoredPurchases();
      setPurchases(cached);
      setLoadError(error?.message || translateText("Xaridlarni yuklab bo'lmadi."));
      return cached;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const query = getPurchaseQuery({ search, statusFilter, supplierFilter });

    setLoading(true);
    setLoadError("");

    const timer = window.setTimeout(() => {
      fetchStoredPurchases(query)
        .then((items) => {
          if (alive) setPurchases(items);
        })
        .catch((error) => {
          if (!alive) return;
          setPurchases(getStoredPurchases());
          setLoadError(error?.message || translateText("Xaridlarni yuklab bo'lmadi."));
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 250);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [search, statusFilter, supplierFilter]);

  const supplierOptions = useMemo(() => {
    const map = new Map();

    purchases.forEach((purchase) => {
      if (purchase.supplierId && purchase.supplierName) {
        map.set(purchase.supplierId, purchase.supplierName);
      }
    });

    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const today = getTodayIso();

    return purchases.filter((purchase) => {
      const productNames =
        purchase.items
          ?.map((item) => item.productName)
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase() || "";

      const matchesSearch =
        !normalizedSearch ||
        (purchase.number || "").toLocaleLowerCase().includes(normalizedSearch) ||
        (purchase.supplierName || "").toLocaleLowerCase().includes(normalizedSearch) ||
        (purchase.warehouseName || "").toLocaleLowerCase().includes(normalizedSearch) ||
        productNames.includes(normalizedSearch);

      const hasDebt = Number(purchase.debtAmount || 0) > 0;
      const isLate = Boolean(
        purchase.expectedDate &&
          purchase.expectedDate < today &&
          purchase.status !== "RECEIVED" &&
          purchase.status !== "CANCELLED",
      );

      const matchesQuickFilter =
        !quickFilter ||
        (quickFilter === "DEBT" && hasDebt) ||
        (quickFilter === "LATE" && isLate);

      return matchesSearch && matchesQuickFilter;
    });
  }, [purchases, search, quickFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, supplierFilter, quickFilter]);

  const stats = useMemo(() => {
    const pending = purchases.filter(
      (purchase) => purchase.status === "ORDERED" || purchase.status === "PARTIALLY_RECEIVED",
    ).length;
    const received = purchases.filter((purchase) => purchase.status === "RECEIVED").length;
    const totalAmount = purchases.reduce((total, purchase) => total + Number(purchase.total || 0), 0);

    return {
      total: purchases.length,
      pending,
      received,
      totalAmount,
    };
  }, [purchases]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedPurchases = filteredPurchases.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilters = Boolean(search || statusFilter || supplierFilter || quickFilter);

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSupplierFilter("");
    setQuickFilter("");
    setPage(1);
  };

  const handlePaymentUpdate = async (values) => {
    setPaymentSubmitting(true);
    setActionError("");

    try {
      await updatePurchasePayment(values);
      setPaymentPurchase(null);
      await refreshPurchases();
    } catch (error) {
      setActionError(error.message || "To'lovni yangilashda xatolik yuz berdi.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleReceive = async ({ receivedItems, receivedDate, idempotencyKey }) => {
    if (!receivePurchase) return;

    setReceiveSubmitting(true);
    setActionError("");

    try {
      const currentPurchase = getStoredPurchases().find((purchase) => purchase.id === receivePurchase.id);

      if (!currentPurchase) {
        throw new Error("Xarid topilmadi.");
      }

      if (currentPurchase.status === "RECEIVED" || currentPurchase.status === "CANCELLED") {
        throw new Error("Bu xaridni qabul qilib bo'lmaydi.");
      }

      await receivePurchaseIntoWarehouse({
        purchase: currentPurchase,
        receivedItems,
        receivedDate,
        idempotencyKey,
      });

      setReceivePurchase(null);
      await refreshPurchases();
    } catch (error) {
      setActionError(error.message || "Xaridni qabul qilishda xatolik yuz berdi.");
    } finally {
      setReceiveSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelPurchaseItem) return;

    setActionError("");

    try {
      await cancelPurchase(cancelPurchaseItem.id);
      setCancelPurchaseItem(null);
      await refreshPurchases();
    } catch (error) {
      setActionError(error.message || "Xaridni bekor qilishda xatolik yuz berdi.");
    }
  };

  return (
    <PageContainer
      title={translateText("Xaridlar")}
      description={translateText("Yetkazib beruvchilardan mahsulot va xomashyo xaridlarini boshqarish.")}
    >
      {actionError && (
        <Toast
          type="error"
          title={translateText("Xatolik")}
          message={actionError}
          onClose={() => setActionError("")}
        />
      )}

      <div className="purchases-page">
        <section className="purchases-page__stats">
          {loading ? (
            Array.from({ length: 4 }, (_, index) => (
              <Card key={index} variant="soft" padding="md" className="purchases-page__stat">
                <Skeleton width={46} height={46} radius={14} />
                <div>
                  <Skeleton width={90} height={11} />
                  <Skeleton width={68} height={22} />
                </div>
              </Card>
            ))
          ) : (
            <>
              <PurchaseStat icon={<ReceiptText size={21} />} label={translateText("Jami buyurtmalar")} value={stats.total} />
              <PurchaseStat
                icon={<LiveIcon icon={Clock3} motion="pulse-soft" active={stats.pending > 0} size={21} />}
                label={translateText("Kutilayotgan")}
                value={stats.pending}
                variant="warning"
              />
              <PurchaseStat
                icon={<LiveIcon icon={CheckCircle2} motion="success-pop" active={stats.received > 0} size={21} />}
                label={translateText("Qabul qilingan")}
                value={stats.received}
                variant="success"
              />
              <PurchaseStat icon={<Wallet size={21} />} label={translateText("Umumiy xarid")} value={formatPurchaseMoney(stats.totalAmount)} />
            </>
          )}
        </section>

        <Card padding="md" className="purchases-page__workspace">
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={translateText("Buyurtma, yetkazib beruvchi, ombor yoki mahsulot...")}
            actionLabel={translateText("Yangi xarid")}
            actionIcon={<Plus size={17} />}
            onAction={() => navigate("/purchases/create")}
          />

          <div className="purchases-page__filters">
            <div className="purchases-page__filter">
              <Select
                value={supplierFilter}
                placeholder={translateText("Barcha yetkazib beruvchilar")}
                options={supplierOptions}
                onChange={(event) => setSupplierFilter(event.target.value)}
              />
            </div>

            <div className="purchases-page__filter">
              <Select
                value={statusFilter}
                placeholder={translateText("Barcha holatlar")}
                options={PURCHASE_STATUS_OPTIONS}
                onChange={(event) => setStatusFilter(event.target.value)}
              />
            </div>

            <div className="purchases-page__filter">
              <Select
                value={quickFilter}
                placeholder={translateText("Barcha xaridlar")}
                options={[
                  { value: "DEBT", label: translateText("Faqat qarzdor") },
                  { value: "LATE", label: translateText("Kechikayotgan") },
                ]}
                onChange={(event) => setQuickFilter(event.target.value)}
              />
            </div>

            {hasFilters && (
              <button type="button" className="purchases-page__clear-filters" onClick={handleClearFilters}>
                {translateText("Filtrlarni tozalash")}
              </button>
            )}
          </div>

          <div className="purchases-page__result">
            <span>
              {filteredPurchases.length} {translateText("ta buyurtma")}
            </span>
            {totalPages > 1 && (
              <span>
                {translateText("Sahifa")} {safePage} / {totalPages}
              </span>
            )}
          </div>

          {loading ? (
            <div className="purchases-page__loading-rows">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} height={48} radius={12} />
              ))}
            </div>
          ) : loadError ? (
            <EmptyState
              title={translateText("Ma'lumotlarni yuklab bo'lmadi")}
              description={loadError}
              actionLabel={translateText("Qayta urinish")}
              onAction={() => refreshPurchases()}
            />
          ) : filteredPurchases.length === 0 ? (
            <EmptyState
              title={translateText("Xarid topilmadi")}
              description={
                hasFilters
                  ? translateText("Qidiruv yoki filterlarga mos xarid mavjud emas.")
                  : translateText("Hozircha xarid buyurtmalari mavjud emas.")
              }
              actionLabel={hasFilters ? translateText("Filtrlarni tozalash") : translateText("Yangi xarid")}
              onAction={hasFilters ? handleClearFilters : () => navigate("/purchases/create")}
            />
          ) : (
            <>
              <PurchaseTable
                purchases={paginatedPurchases}
                onView={(purchase) => navigate(`/purchases/${purchase.id}`)}
                onEdit={(purchase) => navigate(`/purchases/${purchase.id}/edit`)}
                onPayment={(purchase) => setPaymentPurchase(purchase)}
                onReceive={(purchase) => setReceivePurchase(purchase)}
                onCancel={(purchase) => setCancelPurchaseItem(purchase)}
              />

              {totalPages > 1 && (
                <div className="purchases-page__pagination">
                  <button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>
                    {translateText("Oldingi")}
                  </button>

                  <div className="purchases-page__pagination-pages">
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={
                          pageNumber === safePage
                            ? "purchases-page__pagination-page purchases-page__pagination-page--active"
                            : "purchases-page__pagination-page"
                        }
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(current + 1, totalPages))}>
                    {translateText("Keyingi")}
                  </button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <PurchasePaymentModal
        open={Boolean(paymentPurchase)}
        purchase={paymentPurchase}
        onClose={() => setPaymentPurchase(null)}
        onSubmit={handlePaymentUpdate}
        submitting={paymentSubmitting}
      />

      <PurchaseReceiveModal
        open={Boolean(receivePurchase)}
        purchase={receivePurchase}
        onClose={() => setReceivePurchase(null)}
        onSubmit={handleReceive}
        submitting={receiveSubmitting}
      />

      <ConfirmDialog
        open={Boolean(cancelPurchaseItem)}
        title={translateText("Xaridni bekor qilish")}
        description={
          cancelPurchaseItem
            ? `"${cancelPurchaseItem.number}" ${translateText("xarid buyurtmasi bekor qilinadi.")}`
            : ""
        }
        confirmText={translateText("Bekor qilish")}
        danger
        onClose={() => setCancelPurchaseItem(null)}
        onConfirm={handleCancel}
      />
    </PageContainer>
  );
};

const PurchaseStat = ({ icon, label, value, variant }) => (
  <Card variant="soft" padding="md" className="purchases-page__stat">
    <div
      className={[
        "purchases-page__stat-icon",
        variant ? `purchases-page__stat-icon--${variant}` : "",
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

export default PurchasesPage;
