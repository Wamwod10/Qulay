import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";
import { Button } from "../../../../shared/ui";

import AgentForm from "../../components/AgentForm/AgentForm";
import { createAgent } from "../../utils/agentsStorage";

import "./AgentCreatePage.scss";

const AgentCreatePage = () => {
  const navigate = useNavigate();

  const handleSubmit = (values) => {
    const agent = createAgent(values);

    navigate(`/agents/${agent.id}`);
  };

  return (
    <PageContainer
      title="Yangi agent"
      description="Savdo agenti ma'lumotlarini kiriting."
    >
      <div className="agent-create-page">
        <div>
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate("/agents")}
          >
            Ortga
          </Button>
        </div>

        <AgentForm
          onSubmit={handleSubmit}
          onCancel={() => navigate("/agents")}
        />
      </div>
    </PageContainer>
  );
};

export default AgentCreatePage;
