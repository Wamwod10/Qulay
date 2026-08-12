import { ArrowLeft } from "lucide-react";

import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Button } from "../../../../shared/ui";

import SupplierForm from "../../components/SupplierForm/SupplierForm";

import { createSupplier } from "../../utils/suppliersStorage";

const SupplierCreatePage = () => {
  const navigate = useNavigate();

  const handleSubmit = (values) => {
    const supplier = createSupplier(values);

    navigate(`/suppliers/${supplier.id}`);
  };

  return (
    <PageContainer
      title="Yangi yetkazib beruvchi"
      description="Yetkazib beruvchi ma’lumotlarini kiriting."
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
            onClick={() => navigate("/suppliers")}
          >
            Ortga
          </Button>
        </div>

        <SupplierForm
          onSubmit={handleSubmit}
          onCancel={() => navigate("/suppliers")}
        />
      </div>
    </PageContainer>
  );
};

export default SupplierCreatePage;
