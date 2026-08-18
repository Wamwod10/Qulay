import { useEffect, useState } from "react";

import { Badge, Card, EmptyState, Table } from "../../../../shared/ui";
import { getSuperAdminAuditLogs } from "../../services/superAdminApi";

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getSuperAdminAuditLogs()
      .then((data) => setLogs(data.logs || data.auditLogs || []))
      .catch((err) => setError(err.message || "Audit log yuklanmadi."));
  }, []);

  if (error) {
    return <EmptyState title="Audit log yuklanmadi" description={error} />;
  }

  const columns = [
    { key: "action", title: "Action", render: (value) => <Badge>{value}</Badge> },
    { key: "targetType", title: "Target" },
    { key: "targetId", title: "Target ID" },
    { key: "actorUserId", title: "Actor", render: (value) => value || "-" },
    { key: "createdAt", title: "Vaqt", render: (value) => new Date(value).toLocaleString("uz-UZ") },
  ];

  return (
    <div className="sa-users">
      <header className="sa-users__header">
        <div>
          <h1>Audit log</h1>
          <p>Critical Super Admin va tenant activity yozuvlari.</p>
        </div>
      </header>

      <Card padding="md" className="sa-users__workspace">
        {logs.length ? <Table columns={columns} data={logs} rowKey="id" /> : <EmptyState title="Audit yozuvlari yo'q" />}
      </Card>
    </div>
  );
};

export default AuditLogsPage;
