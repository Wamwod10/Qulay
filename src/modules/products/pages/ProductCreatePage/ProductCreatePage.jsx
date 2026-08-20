import { translateText } from "../../../../localization/i18n";import { ArrowLeft } from "lucide-react";

import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Button, Card } from "../../../../shared/ui";

import ProductForm from "../../components/ProductForm/ProductForm";

import { createStoredProduct } from "../../utils/productsStorage";
import { getApiErrorMessage } from "../../../../services/api/apiErrorHandler";
import { useState } from "react";

import "./ProductCreatePage.scss";

const ProductCreatePage = () => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState("");
  const [submitField, setSubmitField] = useState("");

  const handleSubmit = async (product) => {
    setSubmitError("");
    setSubmitField("");
    try {
      await createStoredProduct(product);
      navigate("/products");
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
      setSubmitField(error?.field || "");
    }
  };

  return (
    <PageContainer
      title={translateText("Yangi mahsulot")}
      description={translateText("Katalogga yangi xomashyo, tayyor mahsulot, savdo mahsuloti yoki xizmat qo'shish.")}>
      
      <div className="product-create-page">
        <div className="product-create-page__actions">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate("/products")}>{translateText("Mahsulotlarga qaytish")}


          </Button>
        </div>

        <Card padding="lg" className="product-create-page__form-card">
          <ProductForm
            onSubmit={handleSubmit}
            submitError={submitError}
            submitField={submitField}
            onCancel={() => navigate("/products")} />
          
        </Card>
      </div>
    </PageContainer>);

};

export default ProductCreatePage;
