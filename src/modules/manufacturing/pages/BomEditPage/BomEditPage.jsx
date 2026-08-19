import { ArrowLeft } from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Button } from "../../../../shared/ui";

import BomForm from "../../components/BomForm/BomForm";

import { getStoredBoms, updateBom } from "../../utils/manufacturingStorage";

const BomEditPage = () => {
  const navigate = useNavigate();

  const { bomId } = useParams();

  const bom = getStoredBoms().find((item) => item.id === bomId);

  if (!bom) {
    return (
      <PageContainer title="Retsept topilmadi">
        <Button variant="secondary" onClick={() => navigate("/manufacturing")}>
          Ishlab chiqarishga qaytish
        </Button>
      </PageContainer>
    );
  }

  const handleSubmit = async (values) => {
    const updated = await updateBom({
      ...bom,
      ...values,

      id: bom.id,
    });

    navigate(`/manufacturing/boms/${updated.id}`);
  };

  return (
    <PageContainer title="Retseptni tahrirlash" description={bom.name}>
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
            onClick={() => navigate(`/manufacturing/boms/${bom.id}`)}
          >
            Ortga
          </Button>
        </div>

        <BomForm
          initialValues={bom}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/manufacturing/boms/${bom.id}`)}
        />
      </div>
    </PageContainer>
  );
};

export default BomEditPage;
