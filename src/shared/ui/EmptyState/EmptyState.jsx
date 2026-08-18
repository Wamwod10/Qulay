import { Inbox } from "lucide-react";

import { translateText } from "../../../localization/i18n";
import Button from "../Button/Button";

import "./EmptyState.scss";

const EmptyState = ({
  icon,
  title = "Ma'lumot mavjud emas",
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

      <h3>{translateText(title)}</h3>

      {description && <p>{translateText(description)}</p>}

      {actionLabel && (
        <Button variant="primary" onClick={onAction}>
          {translateText(actionLabel)}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
