import { useEffect, useMemo, useState } from "react";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

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
import { translateText } from "../../../../../localization/i18n";

import "./QualityControlPanel.scss";

const STATUS_OPTIONS = [
  {
    value: QUALITY_STATUS.PASS,
    label: "Qabul qilindi",
  },
  {
    value: QUALITY_STATUS.PARTIAL,
    label: "Qisman qabul",
  },
  {
    value: QUALITY_STATUS.FAIL,
    label: "Rad etildi",
  },
];

const STATUS_ICONS = {
  [QUALITY_STATUS.PASS]: CheckCircle2,
  [QUALITY_STATUS.PARTIAL]: AlertTriangle,
  [QUALITY_STATUS.FAIL]: XCircle,
};

const QualityControlPanel = ({ order, onSave }) => {
  const plannedQuantity = Number(order?.plannedQuantity || 0);

  const [result, setResult] = useState(QUALITY_STATUS.PASS);
  const [acceptedQuantity, setAcceptedQuantity] = useState("");
  const [defectQuantity, setDefectQuantity] = useState("0");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!order) {
      return;
    }

    const qualityControl = order.qualityControl;

    setResult(qualityControl?.result || QUALITY_STATUS.PASS);
    setAcceptedQuantity(
      String(qualityControl?.acceptedQuantity ?? plannedQuantity),
    );
    setDefectQuantity(String(qualityControl?.defectQuantity ?? 0));
    setNote(qualityControl?.note || "");
    setError("");
  }, [order, plannedQuantity]);

  const currentIcon = STATUS_ICONS[result] || AlertTriangle;

  const calculatedDefect = useMemo(() => {
    const accepted = Number(acceptedQuantity || 0);

    return Math.max(plannedQuantity - accepted, 0);
  }, [acceptedQuantity, plannedQuantity]);

  const handleAcceptedChange = (event) => {
    const value = event.target.value;

    setAcceptedQuantity(value);

    if (value !== "") {
      setDefectQuantity(String(calculatedDefectFor(value, plannedQuantity)));
    }
  };

  const handleResultChange = (event) => {
    const value = event.target.value;

    setResult(value);

    if (value === QUALITY_STATUS.FAIL) {
      setAcceptedQuantity("0");
      setDefectQuantity(String(plannedQuantity));
    }

    if (value === QUALITY_STATUS.PASS) {
      setAcceptedQuantity(String(plannedQuantity));
      setDefectQuantity("0");
    }
  };

  const handleSubmit = () => {
    const accepted = Number(acceptedQuantity || 0);
    const defect = Number(defectQuantity || 0);

    setError("");

    if (accepted < 0 || defect < 0) {
      setError("Yaroqli va brak miqdorlari manfiy bo'lishi mumkin emas.");

      return;
    }

    if (accepted + defect > plannedQuantity) {
      setError("Yaroqli va brak miqdorlari reja miqdoridan oshmasligi kerak.");

      return;
    }

    onSave?.({
      result,
      acceptedQuantity: accepted,
      defectQuantity: defect,
      note,
      checkedAt: new Date().toISOString(),
    });
  };

  if (!order) {
    return null;
  }

  return (
    <Card padding="lg" className="quality-control">
      <div className="quality-control__header">
        <div>
          <h3>{translateText("Sifat nazorati")}</h3>
          <p>{translateText("Tayyor mahsulot sifat natijasini kiriting.")}</p>
        </div>

        <div className="quality-control__status">
          <Badge variant={getQualityStatusVariant(result)}>
            <LiveIcon icon={currentIcon} motion="pulse-soft" size={14} />
            {getQualityStatusLabel(result)}
          </Badge>
        </div>
      </div>

      <div className="quality-control__grid">
        <Select
          label="Natija"
          value={result}
          options={STATUS_OPTIONS}
          onChange={handleResultChange}
        />

        <Input
          label={`Reja (${order.unit})`}
          value={plannedQuantity}
          disabled
        />

        <Input
          label={`Yaroqli (${order.unit})`}
          type="number"
          min="0"
          step="any"
          value={acceptedQuantity}
          onChange={handleAcceptedChange}
        />

        <Input
          label={`Brak (${order.unit})`}
          type="number"
          min="0"
          step="any"
          value={defectQuantity}
          hint={`Avtomatik farq: ${calculatedDefect} ${order.unit}`}
          onChange={(event) => setDefectQuantity(event.target.value)}
        />
      </div>

      <Textarea
        label="Tekshiruv izohi"
        value={note}
        placeholder="Masalan: o'lcham va qadoqlash tekshirildi..."
        onChange={(event) => setNote(event.target.value)}
      />

      {error && <div className="quality-control__error">{error}</div>}

      <div className="quality-control__actions">
        <Button onClick={handleSubmit}>{translateText("Sifat nazoratini saqlash")}</Button>
      </div>
    </Card>
  );
};

const calculatedDefectFor = (acceptedQuantity, plannedQuantity) =>
  Math.max(Number(plannedQuantity || 0) - Number(acceptedQuantity || 0), 0);

export default QualityControlPanel;
