import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../../../components/PageContainer/PageContainer";
import { Button } from "../../../../shared/ui";
import AgentForm from "../../components/AgentForm/AgentForm";
import { createAgent } from "../../utils/agentsStorage";
import "./AgentCreatePage.scss";
import { translateText } from "../../../../localization/i18n";
const AgentCreatePage = () => {
  const navigate = useNavigate();
  const handleSubmit = async values => {
    const agent = await createAgent(values);
    navigate(`/agents/${agent.id}`);
  };
  return <PageContainer title={translateText("Yangi agent")} description={translateText("Savdo agenti ma'lumotlarini kiriting.")}>
      <div className="agent-create-page">
        <div>
          <Button variant="secondary" leftIcon={<ArrowLeft size={17} />} onClick={() => navigate("/agents")}>{translateText("Ortga")}</Button>
        </div>

        <AgentForm onSubmit={handleSubmit} onCancel={() => navigate("/agents")} />
      </div>
    </PageContainer>;
};
export default AgentCreatePage;
