import Barcode from "react-barcode";

import { QRCodeSVG } from "qrcode.react";

import { Button, Modal } from "../../../../shared/ui";

import "./BarcodeQrModal.scss";

const BarcodeQrModal = ({ product, open, onClose }) => {
  if (!product) {
    return null;
  }

  const barcodeValue = product.barcode || product.sku || product.id;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Barcode / QR"
      description={`${product.name} - ${barcodeValue}`}
      size="md"
    >
      <div className="barcode-qr-modal">
        <div className="barcode-qr-modal__print-area">
          <div className="barcode-qr-modal__item">
            <span>Barcode</span>

            <div className="barcode-qr-modal__code">
              <Barcode
                value={barcodeValue}
                height={65}
                width={1.35}
                fontSize={13}
                margin={6}
              />
            </div>
          </div>

          <div className="barcode-qr-modal__item">
            <span>QR kod</span>

            <div className="barcode-qr-modal__qr">
              <QRCodeSVG
                value={JSON.stringify({
                  id: product.id,
                  sku: product.sku,
                  barcode: barcodeValue,
                  name: product.name,
                })}
                size={180}
              />
            </div>
          </div>
        </div>

        <div className="barcode-qr-modal__actions">
          <Button variant="secondary" onClick={onClose}>
            Yopish
          </Button>

          <Button onClick={() => window.print()}>Chop etish</Button>
        </div>
      </div>
    </Modal>
  );
};

export default BarcodeQrModal;
