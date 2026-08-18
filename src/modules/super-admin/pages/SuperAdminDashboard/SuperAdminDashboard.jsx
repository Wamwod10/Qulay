import { useEffect, useState } from "react";
import { Activity, Building2, ShieldCheck, Users } from "lucide-react";

import { Badge, Card, EmptyState } from "../../../../shared/ui";
import { translateText } from "../../../../localization/i18n";
import { getSuperAdminDashboard } from "../../services/superAdminApi";

const SuperAdminDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSuperAdminDashboard()
      .then(setData)
      .catch((err) => setError(err.message || "Dashboard yuklanmadi."));
  }, []);

  if (error) {
    return <EmptyState title="Dashboard yuklanmadi" description={error} />;
  }

  if (!data) {
    return <div>{translateText("Dashboard yuklanmoqda...")}</div>;
  }

  const stats = data.stats || {};

  return (
    <div className="sa-dashboard">
      <header className="sa-users__header">
        <div>
          <h1>Platforma dashboard</h1>
          <p>Real DB registratsiyalar, kompaniyalar va platforma activity.</p>
        </div>
      </header>

      <section className="sa-users__stats">
        <Stat icon={<Users />} label="Jami user" value={stats.totalUsers || 0} />
        <Stat icon={<ShieldCheck />} label="Faol user" value={stats.activeUsers || 0} />
        <Stat icon={<Building2 />} label="Kompaniyalar" value={stats.totalCompanies || 0} />
        <Stat icon={<Activity />} label="Bugun yangi" value={stats.newUsersToday || 0} />
      </section>

      <Card padding="md" className="sa-users__workspace">
        <h3>Oxirgi registratsiyalar</h3>
        <div className="sa-modules__list">
          {(data.recentRegistrations || []).map((user) => (
            <div key={user.id} className="sa-modules__row">
              <div>
                <strong>{user.name || user.fullName || user.email}</strong>
                <span>{user.companyName || user.businessName || "Platform"}</span>
              </div>
              <Badge variant={user.status === "BLOCKED" ? "danger" : "success"}>{user.status}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="md" className="sa-users__workspace">
        <h3>{translateText("Recent platform activity")}</h3>
        <div className="sa-modules__list">
          {(data.recentActivity || []).map((log) => (
            <div key={log.id} className="sa-modules__row">
              <div>
                <strong>{log.action}</strong>
                <span>{log.targetType}: {log.targetId}</span>
              </div>
              <small>{new Date(log.createdAt).toLocaleString("uz-UZ")}</small>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const Stat = ({ icon, label, value }) => (
  <Card padding="md" className="sa-users__stat">
    <div className="sa-users__stat-icon">{icon}</div>
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  </Card>
);

export default SuperAdminDashboard;
