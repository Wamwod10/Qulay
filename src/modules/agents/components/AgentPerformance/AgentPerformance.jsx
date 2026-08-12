import {
  CircleDollarSign,
  Gauge,
  ShoppingBag,
  Target,
  TrendingUp,
} from "lucide-react";

import { Card, LiveIcon } from "../../../../shared/ui";

import { formatAgentMoney } from "../../utils/agentHelpers";

import "./AgentPerformance.scss";

const AgentPerformance = ({ performance }) => {
  const progress = Number(performance.progress || 0);
  const progressBar = Number(performance.progressBar || 0);
  const achieved = progress >= 100;

  return (
    <Card padding="lg" className="agent-performance">
      <div className="agent-performance__header">
        <div>
          <h3>Performance</h3>
          <p>Real sales orderlar asosida reja bajarilishi.</p>
        </div>

        <strong>{progress.toFixed(1)}%</strong>
      </div>

      <div className="agent-performance__progress" aria-label="Reja bajarilishi">
        <div
          className={achieved ? "agent-performance__progress-fill--success" : ""}
          style={{
            width: `${Math.max(0, Math.min(progressBar, 100))}%`,
          }}
        />
      </div>

      <div className="agent-performance__stats">
        <PerformanceItem
          icon={<Target size={18} />}
          label="Oylik reja"
          value={`${formatAgentMoney(performance.target)} so'm`}
        />

        <PerformanceItem
          icon={
            achieved ? (
              <LiveIcon icon={TrendingUp} motion="success-pop" once size={18} />
            ) : (
              <TrendingUp size={18} />
            )
          }
          label="Bajarilgan savdo"
          value={`${formatAgentMoney(performance.salesAmount)} so'm`}
        />

        <PerformanceItem
          icon={<Gauge size={18} />}
          label="Reja %"
          value={`${progress.toFixed(1)}%`}
        />

        <PerformanceItem
          icon={<ShoppingBag size={18} />}
          label="Buyurtmalar soni"
          value={`${performance.ordersCount || 0} ta`}
        />

        <PerformanceItem
          icon={<CircleDollarSign size={18} />}
          label="Taxminiy komissiya"
          value={`${formatAgentMoney(performance.commissionAmount)} so'm`}
        />

        <PerformanceItem
          icon={<Target size={18} />}
          label="Qolgan reja"
          value={`${formatAgentMoney(performance.remaining)} so'm`}
        />
      </div>
    </Card>
  );
};

const PerformanceItem = ({ icon, label, value }) => (
  <div className="agent-performance__item">
    <div>{icon}</div>

    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  </div>
);

export default AgentPerformance;
