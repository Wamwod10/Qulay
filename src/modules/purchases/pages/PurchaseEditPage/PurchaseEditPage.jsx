import { translateText } from "../../../../localization/i18n";import { ArrowLeft } from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Button } from "../../../../shared/ui";

import PurchaseForm from "../../components/PurchaseForm/PurchaseForm";

import { getPurchaseById, updatePurchase } from "../../utils/purchasesStorage";
import { getApiErrorMessage } from "../../../../services/api/apiErrorHandler";
import { useState } from "react";

import "./PurchaseEditPage.scss";

const PurchaseEditPage = () => {
  const navigate = useNavigate();

  const { purchaseId } = useParams();

  const purchase = getPurchaseById(purchaseId);
  const [submitError, setSubmitError] = useState("");

  if (!purchase) {
    return (
      <PageContainer
        title={translateText("Xarid topilmadi")}
        description={translateText("Tahrirlamoqchi bo‘lgan xarid mavjud emas.")}>
        
        <Button variant="secondary" onClick={() => navigate("/purchases")}>{translateText("Xaridlarga qaytish")}

        </Button>
      </PageContainer>);

  }

  if (purchase.status === "RECEIVED" || purchase.status === "CANCELLED") {
    return (
      <PageContainer
        title={translateText("Xaridni tahrirlab bo‘lmaydi")}
        description={translateText("Qabul qilingan yoki bekor qilingan xarid o‘zgartirilmaydi.")}>
        
        <Button
          variant="secondary"
          onClick={() => navigate(`/purchases/${purchase.id}`)}>{translateText("Xaridga qaytish")}


        </Button>
      </PageContainer>);

  }

  const handleSubmit = async (values) => {
    setSubmitError("");
    try {
      const updated = await updatePurchase({
        ...purchase,
        ...values,
        id: purchase.id,
        number: purchase.number,
      });
      navigate(`/purchases/${updated.id}`);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    }
  };

  return (
    <PageContainer
      title={translateText("Xaridni tahrirlash")}
      description={`${purchase.number} · ${purchase.supplierName}`}>
      
      <div className="purchase-edit-page">
        <div className="purchase-edit-page__top">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate(`/purchases/${purchase.id}`)}>{translateText("Ortga")}


          </Button>
        </div>

        <PurchaseForm
          initialValues={purchase}
          onSubmit={handleSubmit}
          submitError={submitError}
          onCancel={() => navigate(`/purchases/${purchase.id}`)} />
        
      </div>
    </PageContainer>);

};

export default PurchaseEditPage;
