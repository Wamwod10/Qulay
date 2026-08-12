import {
  CreditCard,
  Eye,
  MoreHorizontal,
  Pencil,
  Power,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { Button } from "../../../../shared/ui";

import "./SupplierActionsMenu.scss";

const SupplierActionsMenu = ({
  supplier,
  onView,
  onEdit,
  onNewPurchase,
  onPayment,
  onToggleStatus,
  onDelete,
}) => {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const [open, setOpen] = useState(false);

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
  });

  const updatePosition = () => {
    if (!buttonRef.current) {
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();

    const menuWidth = 220;
    const menuHeight = 285;

    const spaceBelow = window.innerHeight - rect.bottom;

    const openUp = spaceBelow < menuHeight;

    let top = openUp ? rect.top - menuHeight - 8 : rect.bottom + 8;

    let left = rect.right - menuWidth;

    if (left < 12) {
      left = 12;
    }

    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12;
    }

    setPosition({
      top: Math.max(12, top),
      left,
    });
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    updatePosition();

    const handleOutside = (event) => {
      const clickedButton = buttonRef.current?.contains(event.target);

      const clickedMenu = menuRef.current?.contains(event.target);

      if (!clickedButton && !clickedMenu) {
        setOpen(false);
      }
    };

    const handlePosition = () => {
      updatePosition();
    };

    document.addEventListener("mousedown", handleOutside);

    window.addEventListener("resize", handlePosition);

    window.addEventListener("scroll", handlePosition, true);

    return () => {
      document.removeEventListener("mousedown", handleOutside);

      window.removeEventListener("resize", handlePosition);

      window.removeEventListener("scroll", handlePosition, true);
    };
  }, [open]);

  const execute = (callback) => {
    setOpen(false);

    callback?.(supplier);
  };

  return (
    <>
      <div ref={buttonRef}>
        <Button
          size="sm"
          variant="ghost"
          title="Boshqa amallar"
          onClick={() => {
            setOpen((current) => {
              const next = !current;

              if (next) {
                requestAnimationFrame(updatePosition);
              }

              return next;
            });
          }}
        >
          <MoreHorizontal size={17} />
        </Button>
      </div>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="supplier-actions-menu"
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            <button type="button" onClick={() => execute(onView)}>
              <Eye size={16} />
              Ko‘rish
            </button>

            <button type="button" onClick={() => execute(onEdit)}>
              <Pencil size={16} />
              Tahrirlash
            </button>

            <button type="button" onClick={() => execute(onNewPurchase)}>
              <ShoppingCart size={16} />
              Yangi xarid
            </button>

            <button type="button" onClick={() => execute(onPayment)}>
              <CreditCard size={16} />
              To‘lov / qarz
            </button>

            <button type="button" onClick={() => execute(onToggleStatus)}>
              <Power size={16} />

              {supplier.status === "ACTIVE"
                ? "Faol emas qilish"
                : "Faollashtirish"}
            </button>

            <div className="supplier-actions-menu__divider" />

            <button
              type="button"
              className="supplier-actions-menu__danger"
              onClick={() => execute(onDelete)}
            >
              <Trash2 size={16} />
              O‘chirish
            </button>
          </div>,
          document.body,
        )}
    </>
  );
};

export default SupplierActionsMenu;
