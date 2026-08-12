import { Inbox } from "lucide-react";

import Button from "../Button/Button";

import "./EmptyState.scss";

const EmptyState = ({
  icon,
  title = "Ma’lumot mavjud emas",
  description,
  actionLabel,
  onAction,
}) => {
  const Icon = icon || Inbox;

  return (
    <div className="ui-empty-state">
      <div className="ui-empty-state__icon">
        <Icon size={28} strokeWidth={1.6} />
      </div>

      <h3>{title}</h3>

      {description && <p>{description}</p>}

      {actionLabel && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
