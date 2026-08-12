import { ArrowLeft } from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Button, Card } from "../../../../shared/ui";

import ProductForm from "../../components/ProductForm/ProductForm";

import {
  getStoredProductById,
  updateStoredProduct,
} from "../../utils/productsStorage";

import "./ProductEditPage.scss";

const ProductEditPage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const product = getStoredProductById(productId);

  if (!product) {
    return (
      <PageContainer
        title="Mahsulot topilmadi"
        description="Tahrirlamoqchi bo'lgan mahsulot mavjud emas."
      >
        <Button variant="secondary" onClick={() => navigate("/products")}>
          Mahsulotlarga qaytish
        </Button>
      </PageContainer>
    );
  }

  const handleSubmit = (updatedProduct) => {
    const savedProduct = updateStoredProduct(updatedProduct);

    if (savedProduct) {
      navigate(`/products/${savedProduct.id}`);
    }
  };

  return (
    <PageContainer
      title="Mahsulotni tahrirlash"
      description={`${product.name} - ${product.sku}`}
    >
      <div className="product-edit-page">
        <div className="product-edit-page__actions">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate(`/products/${product.id}`)}
          >
            Ortga
          </Button>
        </div>

        <Card padding="lg" className="product-edit-page__form-card">
          <ProductForm
            initialValues={product}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/products/${product.id}`)}
          />
        </Card>
      </div>
    </PageContainer>
  );
};

export default ProductEditPage;
