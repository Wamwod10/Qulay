import { translateText } from "../../../../localization/i18n";import { ArrowLeft } from "lucide-react";

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
  savePurchaseDraft } from
"../../utils/purchaseDraftStorage";

import { ConfirmDialog } from "../../../../shared/ui";

import "./PurchaseCreatePage.scss";

const PurchaseCreatePage = () => {
  const navigate = useNavigate();

  const existingDraft = getPurchaseDraft();

  const [draft, setDraft] = useState(existingDraft);

  const [draftPromptOpen, setDraftPromptOpen] = useState(
    Boolean(existingDraft)
  );

  const [searchParams] = useSearchParams();

  const supplierId = searchParams.get("supplierId");

  const [useDraft, setUseDraft] = useState(false);


  const handleSubmit = async (values) => {
    const purchase = await createPurchase(values);

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
      title={translateText("Yangi xarid")}
      description={translateText("Yetkazib beruvchidan mahsulot yoki xomashyo xaridini yaratish.")}>
      
      <div className="purchase-create-page">
        <div className="purchase-create-page__top">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate("/purchases")}>{translateText("Xaridlarga qaytish")}


          </Button>
        </div>

        {!draftPromptOpen &&
        <PurchaseForm
          initialValues={
          supplierId ?
          {
            supplierId
          } :
          undefined
          }
          onSubmit={handleSubmit}
          onCancel={() => navigate("/purchases")} />

        }

        <ConfirmDialog
          open={draftPromptOpen}
          title={translateText("Saqlanmagan qoralama")}
          description={
          draft?.savedAt ?
          `${translateText("Oldingi xarid qoralamasi mavjud. Oxirgi saqlangan vaqt:")} ${draft.savedAt}` :
          translateText("Oldingi xarid qoralamasi mavjud.")
          }
          confirmText={translateText("Davom ettirish")}
          cancelText={translateText("Qoralamani o‘chirish")}
          onConfirm={() => {
            setUseDraft(true);
            setDraftPromptOpen(false);
          }}
          onClose={() => {
            clearPurchaseDraft();

            setDraft(null);
            setUseDraft(false);

            setDraftPromptOpen(false);
          }} />
        
      </div>
    </PageContainer>);

};

export default PurchaseCreatePage;
