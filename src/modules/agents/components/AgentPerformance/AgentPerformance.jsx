import { CircleDollarSign, Gauge, ShoppingBag, Target, TrendingUp } from "lucide-react";
import { Card, LiveIcon } from "../../../../shared/ui";
import { formatAgentMoney } from "../../utils/agentHelpers";
import "./AgentPerformance.scss";
import { translateText } from "../../../../localization/i18n";
const AgentPerformance = ({
  performance
}) => {
  const progress = Number(performance.progress || 0);
  const progressBar = Number(performance.progressBar || 0);
  const achieved = progress >= 100;
  return <Card padding="lg" className="agent-performance">
      <div className="agent-performance__header">
        <div>
          <h3>{translateText("Performance")}</h3>
          <p>{translateText("Real sales orderlar asosida reja bajarilishi.")}</p>
        </div>

        <strong>{progress.toFixed(1)}%</strong>
      </div>

      <div className="agent-performance__progress" aria-label={translateText("Reja bajarilishi")}>
        <div className={achieved ? "agent-performance__progress-fill--success" : ""} style={{
        width: `${Math.max(0, Math.min(progressBar, 100))}%`
      }} />
      </div>

      <div className="agent-performance__stats">
        <PerformanceItem icon={<Target size={18} />} label={translateText("Oylik reja")} value={`${formatAgentMoney(performance.target)} ${translateText("so'm")}`} />

        <PerformanceItem icon={achieved ? <LiveIcon icon={TrendingUp} motion="success-pop" once size={18} /> : <TrendingUp size={18} />} label={translateText("Bajarilgan savdo")} value={`${formatAgentMoney(performance.salesAmount)} ${translateText("so'm")}`} />

        <PerformanceItem icon={<Gauge size={18} />} label={translateText("Reja %")} value={`${progress.toFixed(1)}%`} />

        <PerformanceItem icon={<ShoppingBag size={18} />} label={translateText("Buyurtmalar soni")} value={`${performance.ordersCount || 0} ${translateText("ta")}`} />

        <PerformanceItem icon={<CircleDollarSign size={18} />} label={translateText("Taxminiy komissiya")} value={`${formatAgentMoney(performance.commissionAmount)} ${translateText("so'm")}`} />

        <PerformanceItem icon={<Target size={18} />} label={translateText("Qolgan reja")} value={`${formatAgentMoney(performance.remaining)} ${translateText("so'm")}`} />
      </div>
    </Card>;
};
const PerformanceItem = ({
  icon,
  label,
  value
}) => <div className="agent-performance__item">
    <div>{icon}</div>

    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  </div>;
export default AgentPerformance;
