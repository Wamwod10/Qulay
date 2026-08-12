import { ArrowLeft } from "lucide-react";

import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Button } from "../../../../shared/ui";

import PurchaseForm from "../../components/PurchaseForm/PurchaseForm";

import { createPurchase } from "../../utils/purchasesStorage";
import { useSearchParams } from "react-router-dom";

import { useState } from "react";

import {
  clearPurchaseDraft,
  getPurchaseDraft,
  savePurchaseDraft,
} from "../../utils/purchaseDraftStorage";

import { ConfirmDialog } from "../../../../shared/ui";

import "./PurchaseCreatePage.scss";

const PurchaseCreatePage = () => {
  const navigate = useNavigate();

  const existingDraft = getPurchaseDraft();

  const [draft, setDraft] = useState(existingDraft);

  const [draftPromptOpen, setDraftPromptOpen] = useState(
    Boolean(existingDraft),
  );

  const [searchParams] = useSearchParams();

  const supplierId = searchParams.get("supplierId");

  const [useDraft, setUseDraft] = useState(false);


  const handleSubmit = (values) => {
    const purchase = createPurchase(values);

    clearPurchaseDraft();

    navigate(`/purchases/${purchase.id}`);
  };

  const handleDraftChange = (values) => {
    if (draftPromptOpen && !useDraft) {
      return;
    }

    savePurchaseDraft(values);
  };

  return (
    <PageContainer
      title="Yangi xarid"
      description="Yetkazib beruvchidan mahsulot yoki xomashyo xaridini yaratish."
    >
      <div className="purchase-create-page">
        <div className="purchase-create-page__top">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate("/purchases")}
          >
            Xaridlarga qaytish
          </Button>
        </div>

        {!draftPromptOpen && (
          <PurchaseForm
            initialValues={
              supplierId
                ? {
                    supplierId,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            onCancel={() => navigate("/purchases")}
          />
        )}

        <ConfirmDialog
          open={draftPromptOpen}
          title="Saqlanmagan qoralama"
          description={
            draft?.savedAt
              ? `Oldingi xarid qoralamasi mavjud. Oxirgi saqlangan vaqt: ${draft.savedAt}`
              : "Oldingi xarid qoralamasi mavjud."
          }
          confirmText="Davom ettirish"
          cancelText="Qoralamani o‘chirish"
          onConfirm={() => {
            setUseDraft(true);
            setDraftPromptOpen(false);
          }}
          onClose={() => {
            clearPurchaseDraft();

            setDraft(null);
            setUseDraft(false);

            setDraftPromptOpen(false);
          }}
        />
      </div>
    </PageContainer>
  );
};

export default PurchaseCreatePage;
