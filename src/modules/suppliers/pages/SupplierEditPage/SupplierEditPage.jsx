import { ArrowLeft } from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Button } from "../../../../shared/ui";

import SupplierForm from "../../components/SupplierForm/SupplierForm";

import { getSupplierById, updateSupplier } from "../../utils/suppliersStorage";

const SupplierEditPage = () => {
  const navigate = useNavigate();

  const { supplierId } = useParams();

  const supplier = getSupplierById(supplierId);

  if (!supplier) {
    return (
      <PageContainer title="Yetkazib beruvchi topilmadi">
        <Button variant="secondary" onClick={() => navigate("/suppliers")}>
          Yetkazib beruvchilarga qaytish
        </Button>
      </PageContainer>
    );
  }

  const handleSubmit = async (values) => {
    await updateSupplier({
      ...supplier,
      ...values,

      id: supplier.id,
    });

    navigate(`/suppliers/${supplier.id}`);
  };

  return (
    <PageContainer
      title="Yetkazib beruvchini tahrirlash"
      description={supplier.name}
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
            onClick={() => navigate(`/suppliers/${supplier.id}`)}
          >
            Ortga
          </Button>
        </div>

        <SupplierForm
          initialValues={supplier}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/suppliers/${supplier.id}`)}
        />
      </div>
    </PageContainer>
  );
};

export default SupplierEditPage;
