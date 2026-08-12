import {
  Eye,
  MoreVertical,
  Pencil,
  Power,
  Trash2,
  UserPlus,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { Button } from "../../../../shared/ui";

import "./AgentActionsMenu.scss";

const AgentActionsMenu = ({
  agent,
  onView,
  onEdit,
  onAssignCustomer,
  onToggleStatus,
  onDelete,
}) => {
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const updatePosition = () => {
    const rect = wrapperRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const menuWidth = 210;
    const menuHeight = 230;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight;
    const top = openUp ? rect.top - menuHeight - 8 : rect.bottom + 8;
    const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12);

    setPosition({
      top: Math.max(12, top),
      left: Math.max(12, left),
    });
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const runAction = (handler) => {
    setOpen(false);
    handler?.(agent);
  };

  return (
    <div className="agent-actions-menu" ref={wrapperRef}>
      <Button
        size="sm"
        variant="ghost"
        className="agent-actions-menu__trigger"
        title="Amallar"
        onClick={() => {
          updatePosition();
          setOpen((current) => !current);
        }}
      >
        <MoreVertical size={16} />
      </Button>

      {open && (
        <div
          className="agent-actions-menu__dropdown"
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          <button type="button" onClick={() => runAction(onView)}>
            <Eye size={15} />
            <span>Ko'rish</span>
          </button>

          <button type="button" onClick={() => runAction(onEdit)}>
            <Pencil size={15} />
            <span>Tahrirlash</span>
          </button>

          <button type="button" onClick={() => runAction(onAssignCustomer)}>
            <UserPlus size={15} />
            <span>Mijoz biriktirish</span>
          </button>

          <button type="button" onClick={() => runAction(onToggleStatus)}>
            <Power size={15} />
            <span>
              {agent.status === "ACTIVE" ? "Faol emas qilish" : "Faollashtirish"}
            </span>
          </button>

          <div className="agent-actions-menu__divider" />

          <button
            type="button"
            className="agent-actions-menu__danger"
            onClick={() => runAction(onDelete)}
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AgentActionsMenu;
