import { useNavigate } from "react-router-dom";
import PageContainer from "../../../../components/PageContainer/PageContainer";
import CustomerForm from "../../components/CustomerForm/CustomerForm";
import { createCustomer } from "../../utils/customersStorage";
import { translateText } from "../../../../localization/i18n";
const CustomerCreatePage = () => {
  const navigate = useNavigate();
  const handleSubmit = values => {
    const customer = createCustomer(values);
    navigate(`/customers/${customer.id}`);
  };
  return <PageContainer title={translateText("Yangi mijoz")} description={translateText("CRM customer profile, agent assignment va kredit sozlamalari.")}>
      <CustomerForm onSubmit={handleSubmit} onCancel={() => navigate("/customers")} submitLabel="Mijoz yaratish" />
    </PageContainer>;
};
export default CustomerCreatePage;
