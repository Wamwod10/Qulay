import { useEffect, useState } from "react";

import { Badge, Card, EmptyState, Table } from "../../../../shared/ui";
import { translateText } from "../../../../localization/i18n";
import { getSuperAdminAuditLogs } from "../../services/superAdminApi";

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getSuperAdminAuditLogs()
      .then((data) => setLogs(data.logs || data.auditLogs || []))
      .catch((err) => setError(err.message || "Audit jurnali yuklanmadi."));
  }, []);

  if (error) {
    return <EmptyState title={translateText("Audit jurnali yuklanmadi")} description={error} />;
  }

  const columns = [
    { key: "action", title: translateText("Amal"), render: (value) => <Badge>{value}</Badge> },
    { key: "targetType", title: translateText("Nishon") },
    { key: "targetId", title: translateText("Nishon ID") },
    { key: "actorUserId", title: translateText("Bajaruvchi"), render: (value) => value || "-" },
    { key: "createdAt", title: "Vaqt", render: (value) => new Date(value).toLocaleString("uz-UZ") },
  ];

  return (
    <div className="sa-users">
      <header className="sa-users__header">
        <div>
          <h1>{translateText("Audit jurnali")}</h1>
          <p>{translateText("Muhim platforma boshqaruvi va kompaniya faoliyati yozuvlari.")}</p>
        </div>
      </header>

      <Card padding="md" className="sa-users__workspace">
        {logs.length ? <Table columns={columns} data={logs} rowKey="id" /> : <EmptyState title="Audit yozuvlari yo'q" />}
      </Card>
    </div>
  );
};

export default AuditLogsPage;
