const TECHNICAL_LOT_PATTERN = /^(PURCHASE|MFG|RETURN|CANCEL|LEGACY|MANUAL|PRODUCTION)[-_].*(c[a-z0-9]{12,}|[0-9a-f]{8})/i;

export const displayLotNumber = (batch = {}) => {
  const explicit = String(batch.displayBatchNumber || batch.lotNumber || "").trim();
  if (explicit) return explicit;

  const raw = String(batch.batchNumber || "").trim();
  if (raw && !TECHNICAL_LOT_PATTERN.test(raw)) return raw;

  const date = new Date(batch.receivedDate || batch.productionDate || batch.createdAt || Date.now());
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  const digits = String(batch.id || raw || "0").replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `LOT-${year}-${digits}`;
};
