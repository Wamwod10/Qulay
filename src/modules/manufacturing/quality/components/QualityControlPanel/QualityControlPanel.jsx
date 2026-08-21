import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { translateText } from "../../../../../localization/i18n";
import {
  Badge,
  Button,
  Card,
  Input,
  LiveIcon,
  Select,
  Textarea,
} from "../../../../../shared/ui";
import {
  getQualityStatusLabel,
  getQualityStatusVariant,
  QUALITY_STATUS,
} from "../../utils/qualityHelpers";

import "./QualityControlPanel.scss";

const STATUS_OPTIONS = [
  { value: QUALITY_STATUS.PASS, label: "Qabul qilindi" },
  { value: QUALITY_STATUS.PARTIAL, label: "Qisman qabul" },
  { value: QUALITY_STATUS.FAIL, label: "Rad etildi" },
];

const STATUS_ICONS = {
  [QUALITY_STATUS.PASS]: CheckCircle2,
  [QUALITY_STATUS.PARTIAL]: AlertTriangle,
  [QUALITY_STATUS.FAIL]: XCircle,
};

const QualityControlPanel = ({ order, onSave }) => {
  const plannedQuantity = Number(order?.plannedQuantity || 0);
  const [status, setStatus] = useState(QUALITY_STATUS.PASS);
  const [producedQuantity, setProducedQuantity] = useState("");
  const [acceptedQuantity, setAcceptedQuantity] = useState("");
  const [defectQuantity, setDefectQuantity] = useState("0");
  const [wasteQuantity, setWasteQuantity] = useState("0");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!order) return;
    const qualityControl = order.qualityControl || {};
    setStatus(qualityControl.status || qualityControl.result || QUALITY_STATUS.PASS);
    setProducedQuantity(String(qualityControl.producedQuantity ?? order.producedQuantity ?? plannedQuantity));
    setAcceptedQuantity(String(qualityControl.acceptedQuantity ?? order.acceptedQuantity ?? plannedQuantity));
    setDefectQuantity(String(qualityControl.defectQuantity ?? order.defectQuantity ?? 0));
    setWasteQuantity(String(qualityControl.wasteQuantity ?? order.wasteQuantity ?? 0));
    setNote(qualityControl.note || order.qualityNote || "");
    setError("");
  }, [order, plannedQuantity]);

  if (!order) return null;

  const currentIcon = STATUS_ICONS[status] || AlertTriangle;

  const handleSubmit = () => {
    const produced = Number(producedQuantity || 0);
    const accepted = Number(acceptedQuantity || 0);
    const defect = Number(defectQuantity || 0);
    const waste = Number(wasteQuantity || 0);
    setError("");

    if ([produced, accepted, defect, waste].some((value) => !Number.isFinite(value) || value < 0)) {
      setError("Miqdorlar manfiy bo'lishi mumkin emas.");
      return;
    }

    onSave?.({
      status,
      result: status,
      producedQuantity: produced,
      acceptedQuantity: accepted,
      defectQuantity: defect,
      wasteQuantity: waste,
      note,
      checkedAt: new Date().toISOString(),
    });
  };

  return (
    <Card padding="lg" className="quality-control">
      <div className="quality-control__header">
        <div>
          <h3>{translateText("Sifat nazorati")}</h3>
          <p>{translateText("Tayyor mahsulot sifat natijasini kiriting.")}</p>
        </div>
        <div className="quality-control__status">
          <Badge variant={getQualityStatusVariant(status)}>
            <LiveIcon icon={currentIcon} motion="pulse-soft" size={14} />
            {getQualityStatusLabel(status)}
          </Badge>
        </div>
      </div>

      <div className="quality-control__grid">
        <Select label="Natija" value={status} options={STATUS_OPTIONS} onChange={(event) => setStatus(event.target.value)} />
        <Input label={`Reja (${order.unit})`} value={plannedQuantity} disabled />
        <Input label={`Produced (${order.unit})`} type="number" min="0" step="any" value={producedQuantity} onChange={(event) => setProducedQuantity(event.target.value)} />
        <Input label={`Accepted (${order.unit})`} type="number" min="0" step="any" value={acceptedQuantity} onChange={(event) => setAcceptedQuantity(event.target.value)} />
        <Input label={`Defect (${order.unit})`} type="number" min="0" step="any" value={defectQuantity} onChange={(event) => setDefectQuantity(event.target.value)} />
        <Input label={`Waste (${order.unit})`} type="number" min="0" step="any" value={wasteQuantity} onChange={(event) => setWasteQuantity(event.target.value)} />
      </div>

      <Textarea label="Tekshiruv izohi" value={note} placeholder="Masalan: o'lcham va qadoqlash tekshirildi..." onChange={(event) => setNote(event.target.value)} />
      {error && <div className="quality-control__error">{error}</div>}
      <div className="quality-control__actions">
        <Button onClick={handleSubmit}>{translateText("Sifat nazoratini saqlash")}</Button>
      </div>
    </Card>
  );
};

export default QualityControlPanel;
