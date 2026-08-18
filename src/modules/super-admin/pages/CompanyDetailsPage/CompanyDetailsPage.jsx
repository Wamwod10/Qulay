import { useEffect, useState } from "react";
import { ArrowLeft, Ban, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { translateText } from "../../../../localization/i18n";

import { Badge, Button, Card, EmptyState } from "../../../../shared/ui";
import AccountModulesManager from "../../components/AccountModulesManager/AccountModulesManager";
import {
  getSuperAdminCompany,
  updateSuperAdminCompanyStatus,
} from "../../services/superAdminApi";

const CompanyDetailsPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSuperAdminCompany(companyId)
      .then(setCompany)
      .catch((err) => setError(err.message || "Kompaniya yuklanmadi."));
  }, [companyId]);

  if (error) return <EmptyState title="Kompaniya topilmadi" description={error} />;
  if (!company) return <div>Kompaniya yuklanmoqda...</div>;

  const blocked = company.status === "BLOCKED";

  const toggleStatus = async () => {
    const updated = await updateSuperAdminCompanyStatus(company.id, blocked ? "ACTIVE" : "BLOCKED");
    setCompany(updated);
  };

  return (
    <div className="sa-user-details">
      <header className="sa-user-details__header">
        <div>
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate("/superadmin/companies")}>
            Kompaniyalarga qaytish
          </Button>
          <div className="sa-user-details__title">
            <div>
              <div>
                <h1>{company.businessName || company.name}</h1>
                <Badge variant={blocked ? "danger" : "success"}>{company.status}</Badge>
              </div>
              <p>{company.email || company.phone || company.id}</p>
            </div>
          </div>
        </div>
        <Button variant="secondary" leftIcon={blocked ? <CheckCircle2 size={16} /> : <Ban size={16} />} onClick={toggleStatus}>
          {blocked ? "Faollashtirish" : "Bloklash"}
        </Button>
      </header>

      <section className="sa-user-details__summary">
        <Summary label={translateText("Egasi")} value={company.owner?.fullName || company.owner?.email} />
        <Summary label={translateText("Foydalanuvchilar")} value={company.usersCount || 0} />
        <Summary label={translateText("Mahsulotlar")} value={company.usage?.products || 0} />
        <Summary label={translateText("Savdolar")} value={company.usage?.sales || 0} />
      </section>

      <Card padding="lg" className="sa-user-details__info">
        <div className="sa-user-details__section-title">
          <h3>Kompaniya ma'lumotlari</h3>
          <p>{translateText("Kompaniya identifikatori va ro'yxatdan o'tish ma'lumotlari.")}</p>
        </div>
        <div className="sa-user-details__info-grid">
          <Info label={translateText("Kompaniya ID")} value={company.id} />
          <Info label={translateText("Biznes turi")} value={company.businessType} />
          <Info label={translateText("Mamlakat")} value={company.country} />
          <Info label={translateText("Valyuta")} value={company.currency} />
          <Info label={translateText("Yaratilgan")} value={new Date(company.createdAt).toLocaleString("uz-UZ")} />
          <Info label={translateText("Yangilangan")} value={new Date(company.updatedAt).toLocaleString("uz-UZ")} />
        </div>
      </Card>

      <AccountModulesManager user={{ companyId: company.id, businessId: company.id }} />
    </div>
  );
};

const Summary = ({ label, value }) => (
  <Card padding="md" className="sa-user-details__summary-item">
    <span>{label}</span>
    <strong>{value || "-"}</strong>
  </Card>
);

const Info = ({ label, value }) => (
  <div className="sa-user-details__info-item">
    <span>{label}</span>
    <strong>{value || "-"}</strong>
  </div>
);

export default CompanyDetailsPage;
