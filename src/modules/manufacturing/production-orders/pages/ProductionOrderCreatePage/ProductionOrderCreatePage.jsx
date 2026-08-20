import { ArrowLeft } from "lucide-react";

import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../../components/PageContainer/PageContainer";

import { Button } from "../../../../../shared/ui";
import { getApiErrorMessage } from "../../../../../services/api/apiErrorHandler";

import ProductionOrderForm from "../../components/ProductionOrderForm/ProductionOrderForm";

import { createProductionOrder } from "../../../utils/manufacturingStorage";
import { useState } from "react";

const ProductionOrderCreatePage = () => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (values) => {
    setSubmitError("");
    try {
      const order = await createProductionOrder(values);
      navigate(`/manufacturing/orders/${order.id}`);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    }
  };

  return (
    <PageContainer
      title="Yangi ishlab chiqarish"
      description="Ishlab chiqarish buyurtmasini rejalashtirish."
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div>
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate("/manufacturing")}
          >
            Ortga
          </Button>
        </div>

        <ProductionOrderForm
          onSubmit={handleSubmit}
          submitError={submitError}
          onCancel={() => navigate("/manufacturing")}
        />
      </div>
    </PageContainer>
  );
};

export default ProductionOrderCreatePage;
