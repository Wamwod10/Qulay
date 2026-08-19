import { translateText } from "../../../../localization/i18n";import { useEffect, useMemo, useState } from "react";

import { CheckCircle2, Clock3, Plus, ReceiptText, Wallet } from "lucide-react";

import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import {
  Card,
  ConfirmDialog,
  EmptyState,
  LiveIcon,
  Select,
  TableToolbar } from
"../../../../shared/ui";

import PurchasePaymentModal from "../../components/PurchasePaymentModal/PurchasePaymentModal";
import PurchaseTable from "../../components/PurchaseTable/PurchaseTable";

import { PURCHASE_STATUS_OPTIONS } from "../../constants/purchasesMock";

import {
  cancelPurchase,
  duplicatePurchase,
  getStoredPurchases,
  updatePurchasePayment } from
"../../utils/purchasesStorage";

import { receivePurchaseIntoWarehouse } from "../../utils/receivePurchase";

import {
  applyPurchaseReceipt,
  formatPurchaseMoney } from
"../../utils/purchaseHelpers";

import "./PurchasesPage.scss";

const PAGE_SIZE = 10;

const getTodayIso = () => {
  return new Date().toISOString().slice(0, 10);
};

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

  const refreshPurchases = () => {
    setPurchases(getStoredPurchases());
  };

  const supplierOptions = useMemo(() => {
    const map = new Map();

    purchases.forEach((purchase) => {
      if (purchase.supplierId && purchase.supplierName) {
        map.set(purchase.supplierId, purchase.supplierName);
      }
    });

    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label
    }));
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const today = getTodayIso();

    return purchases.filter((purchase) => {
      const purchaseNumber = purchase.number?.toLowerCase() || "";

      const supplierName = purchase.supplierName?.toLowerCase() || "";

      const warehouseName = purchase.warehouseName?.toLowerCase() || "";

      const productNames =
      purchase.items?.
      map((item) => item.productName).
      filter(Boolean).
      join(" ").
      toLowerCase() || "";

      const matchesSearch =
      !normalizedSearch ||
      purchaseNumber.includes(normalizedSearch) ||
      supplierName.includes(normalizedSearch) ||
      warehouseName.includes(normalizedSearch) ||
      productNames.includes(normalizedSearch);

      const matchesStatus = !statusFilter || purchase.status === statusFilter;

      const matchesSupplier =
      !supplierFilter || purchase.supplierId === supplierFilter;

      const hasDebt = Number(purchase.debtAmount || 0) > 0;

      const isLate = Boolean(
        purchase.expectedDate &&
        purchase.expectedDate < today &&
        purchase.status !== "RECEIVED" &&
        purchase.status !== "CANCELLED"
      );

      const matchesQuickFilter =
      !quickFilter ||
      quickFilter === "DEBT" && hasDebt ||
      quickFilter === "LATE" && isLate;

      return (
        matchesSearch && matchesStatus && matchesSupplier && matchesQuickFilter);

    });
  }, [purchases, search, statusFilter, supplierFilter, quickFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, supplierFilter, quickFilter]);

  const stats = useMemo(() => {
    const pending = purchases.filter(
      (purchase) =>
      purchase.status === "ORDERED" ||
      purchase.status === "PARTIALLY_RECEIVED"
    ).length;

    const received = purchases.filter(
      (purchase) => purchase.status === "RECEIVED"
    ).length;

    const totalAmount = purchases.reduce(
      (total, purchase) => total + Number(purchase.total || 0),
      0
    );

    return {
      total: purchases.length,

      pending,
      received,
      totalAmount
    };
  }, [purchases]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPurchases.length / PAGE_SIZE)
  );

  const safePage = Math.min(page, totalPages);

  const paginatedPurchases = filteredPurchases.slice(
    (safePage - 1) * PAGE_SIZE,

    safePage * PAGE_SIZE
  );

  const hasFilters = Boolean(
    search || statusFilter || supplierFilter || quickFilter
  );

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSupplierFilter("");
    setQuickFilter("");
    setPage(1);
  };

  const handleDuplicate = (purchase) => {
    try {
      const duplicated = duplicatePurchase(purchase.id);

      refreshPurchases();

      navigate(`/purchases/${duplicated.id}/edit`);
    } catch (error) {
      alert(error.message || "Xaridni nusxalashda xatolik yuz berdi.");
    }
  };

  const handlePaymentUpdate = async (values) => {
    try {
      await updatePurchasePayment(values);

      setPaymentPurchase(null);

      refreshPurchases();
    } catch (error) {
      alert(error.message || "To‘lovni yangilashda xatolik yuz berdi.");
    }
  };

  const handleReceive = async (receivedItems) => {
    if (!receivePurchase) {
      return;
    }

    try {
      const currentPurchase = getStoredPurchases().find(
        (purchase) => purchase.id === receivePurchase.id
      );

      if (!currentPurchase) {
        throw new Error("Xarid topilmadi.");
      }

      if (
      currentPurchase.status === "RECEIVED" ||
      currentPurchase.status === "CANCELLED")
      {
        throw new Error("Bu xaridni qabul qilib bo‘lmaydi.");
      }

      await receivePurchaseIntoWarehouse({
        purchase: currentPurchase,

        receivedItems
      });

      applyPurchaseReceipt({
        purchaseId: currentPurchase.id,

        receivedItems
      });

      setReceivePurchase(null);

      refreshPurchases();
    } catch (error) {
      alert(error.message || "Xaridni qabul qilishda xatolik yuz berdi.");
    }
  };

  const handleCancel = async () => {
    if (!cancelPurchaseItem) {
      return;
    }

    try {
      await cancelPurchase(cancelPurchaseItem.id);

      setCancelPurchaseItem(null);

      refreshPurchases();
    } catch (error) {
      alert(error.message || "Xaridni bekor qilishda xatolik yuz berdi.");
    }
  };

  return (
    <PageContainer
      title={translateText("Xaridlar")}
      description={translateText("Yetkazib beruvchilardan mahsulot va xomashyo xaridlarini boshqarish.")}>
      
      <div className="purchases-page">
        <section className="purchases-page__stats">
          <PurchaseStat
            icon={<ReceiptText size={21} />}
            label={translateText("Jami buyurtmalar")}
            value={stats.total} />
          

          <PurchaseStat
            icon={
            <LiveIcon
              icon={Clock3}
              motion="pulse-soft"
              active={stats.pending > 0}
              size={21} />

            }
            label={translateText("Kutilayotgan")}
            value={stats.pending}
            variant="warning" />
          

          <PurchaseStat
            icon={
            <LiveIcon
              icon={CheckCircle2}
              motion="success-pop"
              active={stats.received > 0}
              size={21} />

            }
            label={translateText("Qabul qilingan")}
            value={stats.received}
            variant="success" />
          

          <PurchaseStat
            icon={<Wallet size={21} />}
            label={translateText("Umumiy xarid")}
            value={formatPurchaseMoney(stats.totalAmount)} />
          
        </section>

        <Card padding="md" className="purchases-page__workspace">
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={translateText("Buyurtma, yetkazib beruvchi, ombor yoki mahsulot...")}
            actionLabel={translateText("Yangi xarid")}
            actionIcon={<Plus size={17} />}
            onAction={() => navigate("/purchases/create")} />
          

          <div className="purchases-page__filters">
            <div className="purchases-page__filter">
              <Select
                value={supplierFilter}
                placeholder={translateText("Barcha yetkazib beruvchilar")}
                options={supplierOptions}
                onChange={(event) => setSupplierFilter(event.target.value)} />
              
            </div>

            <div className="purchases-page__filter">
              <Select
                value={statusFilter}
                placeholder={translateText("Barcha holatlar")}
                options={PURCHASE_STATUS_OPTIONS}
                onChange={(event) => setStatusFilter(event.target.value)} />
              
            </div>

            <div className="purchases-page__filter">
              <Select
                value={quickFilter}
                placeholder={translateText("Barcha xaridlar")}
                options={[
                {
                  value: "DEBT",
                  label: translateText("Faqat qarzdor")
                },
                {
                  value: "LATE",
                  label: translateText("Kechikayotgan")
                }]
                }
                onChange={(event) => setQuickFilter(event.target.value)} />
              
            </div>

            {hasFilters &&
            <button
              type="button"
              className="purchases-page__clear-filters"
              onClick={handleClearFilters}>{translateText("Filtrlarni tozalash")}


            </button>
            }
          </div>

          <div className="purchases-page__result">
            <span>
              {filteredPurchases.length} {translateText("ta buyurtma")}
            </span>

            {totalPages > 1 &&
            <span>{translateText("Sahifa")}
              {safePage} / {totalPages}
              </span>
            }
          </div>

          {filteredPurchases.length === 0 ?
          <EmptyState
            title={translateText("Xarid topilmadi")}
            description={
            hasFilters ?
            translateText("Qidiruv yoki filterlarga mos xarid mavjud emas.") :
            translateText("Hozircha xarid buyurtmalari mavjud emas.")
            }
            actionLabel={
            hasFilters ? translateText("Filtrlarni tozalash") : translateText("Yangi xarid")
            }
            onAction={
            hasFilters ?
            handleClearFilters :
            () => navigate("/purchases/create")
            } /> :


          <>
              <PurchaseTable
              purchases={paginatedPurchases}
              onView={(purchase) => navigate(`/purchases/${purchase.id}`)}
              onEdit={(purchase) =>
              navigate(`/purchases/${purchase.id}/edit`)
              }
              onPayment={(purchase) => setPaymentPurchase(purchase)}
              onReceive={(purchase) => setReceivePurchase(purchase)}
              onCancel={(purchase) => setCancelPurchaseItem(purchase)}
              onDuplicate={handleDuplicate} />
            

              {totalPages > 1 &&
            <div className="purchases-page__pagination">
                  <button
                type="button"
                disabled={safePage <= 1}
                onClick={() =>
                setPage((current) => Math.max(current - 1, 1))
                }>{translateText("Oldingi")}


              </button>

                  <div className="purchases-page__pagination-pages">
                    {Array.from(
                  {
                    length: totalPages
                  },
                  (_, index) => index + 1
                ).map((pageNumber) =>
                <button
                  key={pageNumber}
                  type="button"
                  className={
                  pageNumber === safePage ?
                  "purchases-page__pagination-page purchases-page__pagination-page--active" :
                  "purchases-page__pagination-page"
                  }
                  onClick={() => setPage(pageNumber)}>
                  
                        {pageNumber}
                      </button>
                )}
                  </div>

                  <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() =>
                setPage((current) => Math.min(current + 1, totalPages))
                }>{translateText("Keyingi")}


              </button>
                </div>
            }
            </>
          }
        </Card>
      </div>

      <PurchasePaymentModal
        open={Boolean(paymentPurchase)}
        purchase={paymentPurchase}
        onClose={() => setPaymentPurchase(null)}
        onSubmit={handlePaymentUpdate} />
      

      <ConfirmDialog
        open={Boolean(cancelPurchaseItem)}
        title={translateText("Xaridni bekor qilish")}
        description={
        cancelPurchaseItem ?
        `"${cancelPurchaseItem.number}" ${translateText("xarid buyurtmasi bekor qilinadi.")}` :
        ""
        }
        confirmText={translateText("Bekor qilish")}
        danger
        onClose={() => setCancelPurchaseItem(null)}
        onConfirm={handleCancel} />
      
    </PageContainer>);

};

const PurchaseStat = ({ icon, label, value, variant }) => {
  return (
    <Card variant="soft" padding="md" className="purchases-page__stat">
      <div
        className={[
        "purchases-page__stat-icon",

        variant ? `purchases-page__stat-icon--${variant}` : ""].

        filter(Boolean).
        join(" ")}>
        
        {icon}
      </div>

      <div>
        <span>{label}</span>

        <strong>{value}</strong>
      </div>
    </Card>);

};

export default PurchasesPage;
