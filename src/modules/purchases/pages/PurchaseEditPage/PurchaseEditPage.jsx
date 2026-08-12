import { ArrowLeft } from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Button } from "../../../../shared/ui";

import PurchaseForm from "../../components/PurchaseForm/PurchaseForm";

import { getPurchaseById, updatePurchase } from "../../utils/purchasesStorage";

import "./PurchaseEditPage.scss";

const PurchaseEditPage = () => {
  const navigate = useNavigate();

  const { purchaseId } = useParams();

  const purchase = getPurchaseById(purchaseId);

  if (!purchase) {
    return (
      <PageContainer
        title="Xarid topilmadi"
        description="Tahrirlamoqchi bo‘lgan xarid mavjud emas."
      >
        <Button variant="secondary" onClick={() => navigate("/purchases")}>
          Xaridlarga qaytish
        </Button>
      </PageContainer>
    );
  }

  if (purchase.status === "RECEIVED" || purchase.status === "CANCELLED") {
    return (
      <PageContainer
        title="Xaridni tahrirlab bo‘lmaydi"
        description="Qabul qilingan yoki bekor qilingan xarid o‘zgartirilmaydi."
      >
        <Button
          variant="secondary"
          onClick={() => navigate(`/purchases/${purchase.id}`)}
        >
          Xaridga qaytish
        </Button>
      </PageContainer>
    );
  }

  const handleSubmit = (values) => {
    const updated = updatePurchase({
      ...purchase,
      ...values,

      id: purchase.id,

      number: purchase.number,
    });

    navigate(`/purchases/${updated.id}`);
  };

  return (
    <PageContainer
      title="Xaridni tahrirlash"
      description={`${purchase.number} · ${purchase.supplierName}`}
    >
      <div className="purchase-edit-page">
        <div className="purchase-edit-page__top">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate(`/purchases/${purchase.id}`)}
          >
            Ortga
          </Button>
        </div>

        <PurchaseForm
          initialValues={purchase}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/purchases/${purchase.id}`)}
        />
      </div>
    </PageContainer>
  );
};

export default PurchaseEditPage;
