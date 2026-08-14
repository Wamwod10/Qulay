import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import CustomerForm from "../../components/CustomerForm/CustomerForm";
import { createCustomer } from "../../utils/customersStorage";

const CustomerCreatePage = () => {
  const navigate = useNavigate();

  const handleSubmit = (values) => {
    const customer = createCustomer(values);

    navigate(`/customers/${customer.id}`);
  };

  return (
    <PageContainer
      title="Yangi mijoz"
      description="CRM customer profile, agent assignment va kredit sozlamalari."
    >
      <CustomerForm
        onSubmit={handleSubmit}
        onCancel={() => navigate("/customers")}
        submitLabel="Mijoz yaratish"
      />
    </PageContainer>
  );
};

export default CustomerCreatePage;
