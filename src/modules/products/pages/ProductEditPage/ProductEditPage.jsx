import { translateText } from "../../../../localization/i18n";import { ArrowLeft } from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Button, Card } from "../../../../shared/ui";

import ProductForm from "../../components/ProductForm/ProductForm";

import {
  getStoredProductById,
  updateStoredProduct } from
"../../utils/productsStorage";
import { getApiErrorMessage } from "../../../../services/api/apiErrorHandler";
import { useState } from "react";

import "./ProductEditPage.scss";

const ProductEditPage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const product = getStoredProductById(productId);
  const [submitError, setSubmitError] = useState("");
  const [submitField, setSubmitField] = useState("");

  if (!product) {
    return (
      <PageContainer
        title={translateText("Mahsulot topilmadi")}
        description={translateText("Tahrirlamoqchi bo'lgan mahsulot mavjud emas.")}>
        
        <Button variant="secondary" onClick={() => navigate("/products")}>{translateText("Mahsulotlarga qaytish")}

        </Button>
      </PageContainer>);

  }

  const handleSubmit = async (updatedProduct) => {
    setSubmitError("");
    setSubmitField("");

    try {
      const savedProduct = await updateStoredProduct(updatedProduct);

      if (savedProduct) {
        navigate(`/products/${savedProduct.id}`);
      }
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
      setSubmitField(error?.field || "");
    }
  };

  return (
    <PageContainer
      title={translateText("Mahsulotni tahrirlash")}
      description={`${product.name} - ${product.sku}`}>
      
      <div className="product-edit-page">
        <div className="product-edit-page__actions">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate(`/products/${product.id}`)}>{translateText("Ortga")}


          </Button>
        </div>

        <Card padding="lg" className="product-edit-page__form-card">
          <ProductForm
            initialValues={product}
            onSubmit={handleSubmit}
            submitError={submitError}
            submitField={submitField}
            onCancel={() => navigate(`/products/${product.id}`)} />
          
        </Card>
      </div>
    </PageContainer>);

};

export default ProductEditPage;
