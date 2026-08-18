import { useNavigate, useParams } from "react-router-dom";
import PageContainer from "../../../../components/PageContainer/PageContainer";
import { Button } from "../../../../shared/ui";
import CustomerForm from "../../components/CustomerForm/CustomerForm";
import { getCustomerById, updateCustomer } from "../../utils/customersStorage";
import { translateText } from "../../../../localization/i18n";
const CustomerEditPage = () => {
  const navigate = useNavigate();
  const {
    customerId
  } = useParams();
  const customer = getCustomerById(customerId);
  const handleSubmit = values => {
    const saved = updateCustomer(values);
    navigate(`/customers/${saved?.id || customerId}`);
  };
  if (!customer) {
    return <PageContainer title={translateText("Mijoz topilmadi")} description={translateText("Tahrirlash uchun customer mavjud emas.")}>
        <Button variant="secondary" onClick={() => navigate("/customers")}>{translateText("Mijozlarga qaytish")}</Button>
      </PageContainer>;
  }
  return <PageContainer title={translateText("Mijozni tahrirlash")} description={customer.name || customer.phone || customer.id}>
      <CustomerForm initialCustomer={customer} onSubmit={handleSubmit} onCancel={() => navigate(`/customers/${customer.id}`)} />
    </PageContainer>;
};
export default CustomerEditPage;
