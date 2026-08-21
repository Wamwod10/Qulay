import {
  CheckCircle2,
  Circle,
  Clock3,
  Cog,
  Flame,
  PackageCheck,
  Play,
  Snowflake,
} from "lucide-react";

import { Badge, Button, Card, LiveIcon } from "../../../../../shared/ui";

import "./ProductionStages.scss";

const ProductionStages = ({
  stages = [],
  orderStatus,
  onStart,
  onComplete,
}) => {
  return (
    <Card padding="lg" className="production-stages">
      <div className="production-stages__header">
        <div>
          <h3>Ishlab chiqarish bosqichlari</h3>

          <p>Ish jarayonini bosqichma-bosqich kuzatish.</p>
        </div>
      </div>

      <div className="production-stages__list">
        {stages.map((stage, index) => {
          const previousCompleted =
            index === 0 || stages[index - 1]?.status === "COMPLETED";

          const canStart =
            orderStatus === "IN_PROGRESS" &&
            stage.status === "PENDING" &&
            previousCompleted;

          const canComplete =
            orderStatus === "IN_PROGRESS" && stage.status === "IN_PROGRESS";

          return (
            <div
              key={stage.id}
              className={[
                "production-stages__item",
                `production-stages__item--${stage.status.toLowerCase()}`,
              ].join(" ")}
            >
              <div className="production-stages__number">
                <StageLiveIcon stage={stage} />
              </div>

              <div className="production-stages__content">
                <div className="production-stages__title">
                  <strong>
                    {index + 1}. {stage.name}
                  </strong>

                  <Badge
                    variant={
                      stage.status === "COMPLETED"
                        ? "success"
                        : stage.status === "IN_PROGRESS"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {stage.status === "COMPLETED"
                      ? "Tugadi"
                      : stage.status === "IN_PROGRESS"
                        ? "Jarayonda"
                        : "Kutilmoqda"}
                  </Badge>
                </div>

                <div className="production-stages__dates">
                  {stage.startedAt && <span>Boshlandi: {stage.startedAt}</span>}

                  {stage.completedAt && (
                    <span>Tugadi: {stage.completedAt}</span>
                  )}
                </div>
              </div>

              <div className="production-stages__actions">
                {canStart && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onStart?.(stage.id)}
                  >
                    Boshlash
                  </Button>
                )}

                {canComplete && (
                  <Button size="sm" onClick={() => onComplete?.(stage.id)}>
                    Tugatish
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const StageLiveIcon = ({ stage }) => {
  const stageKey = `${stage.id || ""} ${stage.name || ""}`.toLowerCase();

  if (stage.status === "COMPLETED") {
    const CompleteIcon = stageKey.includes("packaging") || stageKey.includes("qadoqlash")
      ? PackageCheck
      : CheckCircle2;

    return (
      <LiveIcon
        icon={CompleteIcon}
        motion="success-pop"
        active
        size={16}
      />
    );
  }

  if (stage.status === "PENDING") {
    return <LiveIcon icon={Clock3} motion="pulse-soft" active size={15} />;
  }

  if (stageKey.includes("mixing") || stageKey.includes("aralashtirish") || stageKey.includes("tayyorlash")) {
    return <LiveIcon icon={Cog} motion="spin-slow" active size={16} />;
  }

  if (stageKey.includes("baking") || stageKey.includes("ishlab chiqarish")) {
    return <LiveIcon icon={Flame} motion="pulse-soft" active size={16} />;
  }

  if (stageKey.includes("cooling") || stageKey.includes("sovutish") || stageKey.includes("sifat")) {
    return <LiveIcon icon={Snowflake} motion="spin-slow" active size={16} />;
  }

  if (stageKey.includes("packaging") || stageKey.includes("qadoqlash")) {
    return <LiveIcon icon={PackageCheck} motion="pulse-soft" active size={16} />;
  }

  if (stage.status === "IN_PROGRESS") {
    return <LiveIcon icon={Play} motion="pulse-soft" active size={15} />;
  }

  return <Circle size={14} />;
};

export default ProductionStages;
