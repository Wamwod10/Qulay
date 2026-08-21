import { translateText } from "../../../../localization/i18n";import {
  Ban,
  CreditCard,
  Eye,
  MoreHorizontal,
  Pencil,
  PackageCheck } from
"lucide-react";

import { useEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { Button } from "../../../../shared/ui";

import "./PurchaseActionsMenu.scss";

const PurchaseActionsMenu = ({
  purchase,
  onView,
  onEdit,
  onPayment,
  onReceive,
  onCancel
}) => {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const [open, setOpen] = useState(false);

  const [position, setPosition] = useState({
    top: 0,
    left: 0
  });

  const canEdit =
  purchase.status !== "RECEIVED" && purchase.status !== "CANCELLED";

  const canReceive =
  purchase.status === "ORDERED" || purchase.status === "PARTIALLY_RECEIVED";

  const canPayment =
  purchase.status === "PARTIALLY_RECEIVED" || purchase.status === "RECEIVED";

  const canCancel =
  purchase.status === "DRAFT" || purchase.status === "ORDERED";

  const updatePosition = () => {
    if (!buttonRef.current) {
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();

    const menuWidth = 210;
    const menuHeight = 240;

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
      left
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

    const handlePosition = () => updatePosition();

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
    callback?.(purchase);
  };

  return (
    <>
      <div ref={buttonRef}>
        <Button
          size="sm"
          variant="ghost"
          title={translateText("Boshqa amallar")}
          onClick={() => {
            setOpen((current) => {
              const next = !current;

              if (next) {
                requestAnimationFrame(updatePosition);
              }

              return next;
            });
          }}>
          
          <MoreHorizontal size={17} />
        </Button>
      </div>

      {open &&
      createPortal(
        <div
          ref={menuRef}
          className="purchase-actions-menu"
          style={{
            top: position.top,
            left: position.left
          }}>
          
            <button type="button" onClick={() => execute(onView)}>
              <Eye size={16} />{translateText("Ko‘rish")}

          </button>

            {canEdit &&
          <button type="button" onClick={() => execute(onEdit)}>
                <Pencil size={16} />{translateText("Tahrirlash")}

          </button>
          }

            {canPayment &&
          <button type="button" onClick={() => execute(onPayment)}>
                <CreditCard size={16} />{translateText("To‘lov")}

          </button>
          }

            {canReceive &&
          <button type="button" onClick={() => execute(onReceive)}>
                <PackageCheck size={16} />{translateText("Qabul qilish")}

          </button>
          }

            {canCancel &&
          <>
                <div className="purchase-actions-menu__divider" />

                <button
              type="button"
              className="purchase-actions-menu__danger"
              onClick={() => execute(onCancel)}>
              
                  <Ban size={16} />{translateText("Bekor qilish")}

            </button>
              </>
          }
          </div>,
        document.body
      )}
    </>);

};

export default PurchaseActionsMenu;
