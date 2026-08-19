import { ArrowLeft } from "lucide-react";

import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Button } from "../../../../shared/ui";

import BomForm from "../../components/BomForm/BomForm";

import { createBom } from "../../utils/manufacturingStorage";

const BomCreatePage = () => {
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    const bom = await createBom(values);

    navigate(`/manufacturing/boms/${bom.id}`);
  };

  return (
    <PageContainer
      title="Yangi retsept"
      description="Mahsulot ishlab chiqarish uchun xomashyo tarkibini yarating."
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

        <BomForm
          onSubmit={handleSubmit}
          onCancel={() => navigate("/manufacturing")}
        />
      </div>
    </PageContainer>
  );
};

export default BomCreatePage;
