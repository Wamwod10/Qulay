import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";
import { Button } from "../../../../shared/ui";

import AgentForm from "../../components/AgentForm/AgentForm";

import {
  getAgentById,
  updateAgent,
} from "../../utils/agentsStorage";

import "./AgentEditPage.scss";

const AgentEditPage = () => {
  const navigate = useNavigate();
  const { agentId } = useParams();

  const agent = getAgentById(agentId);

  if (!agent) {
    return (
      <PageContainer
        title="Agent topilmadi"
        description="Tahrirlamoqchi bo'lgan agent mavjud emas."
      >
        <Button
          variant="secondary"
          onClick={() => navigate("/agents")}
        >
          Agentlarga qaytish
        </Button>
      </PageContainer>
    );
  }

  const handleSubmit = (values) => {
    const updated = updateAgent({
      ...agent,
      ...values,
      id: agent.id,
    });

    navigate(`/agents/${updated.id}`);
  };

  return (
    <PageContainer
      title="Agentni tahrirlash"
      description={agent.name}
    >
      <div className="agent-edit-page">
        <div>
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate(`/agents/${agent.id}`)}
          >
            Ortga
          </Button>
        </div>

        <AgentForm
          initialValues={agent}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/agents/${agent.id}`)}
        />
      </div>
    </PageContainer>
  );
};

export default AgentEditPage;
