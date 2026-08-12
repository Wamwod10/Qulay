import {
  Archive,
  Barcode,
  Boxes,
  Copy,
  DollarSign,
  MoreHorizontal,
  Power,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";

import Button from "../../../../shared/ui/Button/Button";

import "./ProductActionsMenu.scss";

const ProductActionsMenu = ({
  product,
  onToggleStatus,
  onDuplicate,
  onBarcode,
  onStockAdjustment,
  onPriceChange,
  onArchive,
  onDelete,
}) => {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (!buttonRef.current) {
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 215;
    const menuHeight = product.status === "ARCHIVED" ? 286 : 330;
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldOpenUp = spaceBelow < menuHeight && rect.top > spaceBelow;

    let top = shouldOpenUp ? rect.top - menuHeight - 8 : rect.bottom + 8;
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

    const handleResize = () => {
      updatePosition();
    };

    const handleScroll = () => {
      updatePosition();
    };

    const handleOutsideClick = (event) => {
      const clickedButton = buttonRef.current?.contains(event.target);
      const clickedMenu = menuRef.current?.contains(event.target);

      if (!clickedButton && !clickedMenu) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, product.status]);

  const execute = (callback) => {
    setOpen(false);
    callback?.(product);
  };

  return (
    <div className="product-actions-menu">
      <div ref={buttonRef}>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Boshqa amallar"
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
            className="product-actions-menu__dropdown"
            style={{ top: position.top, left: position.left }}
          >
            {product.status !== "ARCHIVED" && (
              <button type="button" onClick={() => execute(onToggleStatus)}>
                <Power size={16} />
                {product.status === "ACTIVE"
                  ? "Faol emas qilish"
                  : "Faollashtirish"}
              </button>
            )}

            <button type="button" onClick={() => execute(onDuplicate)}>
              <Copy size={16} />
              Nusxa olish
            </button>

            <button type="button" onClick={() => execute(onBarcode)}>
              <Barcode size={16} />
              Barcode / QR
            </button>

            <button type="button" onClick={() => execute(onStockAdjustment)}>
              <Boxes size={16} />
              Qoldiqni tuzatish
            </button>

            <button type="button" onClick={() => execute(onPriceChange)}>
              <DollarSign size={16} />
              Narxni o'zgartirish
            </button>

            <div className="product-actions-menu__divider" />

            <button type="button" onClick={() => execute(onArchive)}>
              {product.status === "ARCHIVED" ? (
                <RotateCcw size={16} />
              ) : (
                <Archive size={16} />
              )}
              {product.status === "ARCHIVED"
                ? "Arxivdan qaytarish"
                : "Arxivga o'tkazish"}
            </button>

            <button
              type="button"
              className="product-actions-menu__danger"
              onClick={() => execute(onDelete)}
            >
              <Trash2 size={16} />
              O'chirish
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default ProductActionsMenu;
