import { useMemo, useRef, useState } from "react";

import {
  Download,
  RotateCcw,
  Search,
  Settings2,
  Upload,
} from "lucide-react";

import { useDispatch, useSelector } from "react-redux";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import {
  Button,
  ConfirmDialog,
  Input,
  Select,
  Switch,
} from "../../../../shared/ui";

import { navigationItems } from "../../../../config/navigation.config";

import { getStoredAgents } from "../../../agents/utils/agentsStorage";
import { getStoredCustomers } from "../../../customers/utils/customersStorage";
import { getStoredCashboxes } from "../../../finance/utils/financeStorage";
import { getStoredShifts } from "../../../employees/utils/hrStorage";
import { getStoredWarehouses } from "../../../warehouse/utils/warehouseManagementStorage";

import TableSettingsPanel from "../../components/TableSettingsPanel/TableSettingsPanel";

import {
  importSettings,
  resetAllSettings,
  resetSection,
  resetTerminology,
  setModulesDefault,
  setTerminology,
  updateAppearance,
  updateBehavior,
  updateDefaults,
  updateFormats,
  updateModuleSettings,
  updateNotifications,
  updateSection,
} from "../../../../store/slices/settingsSlice";

import {
  DEFAULT_SETTINGS,
  TERMINOLOGY_DEFAULTS,
} from "../../constants/settingsDefaults";

import { TABLE_REGISTRY } from "../../constants/tableRegistry";
import { LANGUAGE_OPTIONS as APP_LANGUAGE_OPTIONS } from "../../../../localization/languages";

import {
  MODULE_ICON_LABELS,
  MODULE_ICON_OPTIONS,
  mergeNavigationSettings,
} from "../../utils/moduleSettingsHelpers";

import {
  parsePlatformSettingsImport,
  serializePlatformSettings,
} from "../../utils/settingsStorage";

import "./GeneralSettingsPage.scss";

const FONT_SIZE_OPTIONS = [
  { value: "small", label: "Kichik" },
  { value: "standard", label: "Standart" },
  { value: "large", label: "Katta" },
  { value: "extra-large", label: "Juda katta" },
];

const WEIGHT_OPTIONS = [300, 400, 500, 600, 700, 800].map((value) => ({
  value: String(value),
  label: String(value),
}));

const TABLE_SIZE_OPTIONS = [11, 12, 13, 14, 15, 16].map((value) => ({
  value: String(value),
  label: `${value}px`,
}));

const DENSITY_OPTIONS = [
  { value: "compact", label: "Ixcham" },
  { value: "normal", label: "Oddiy" },
  { value: "comfortable", label: "Keng" },
];

const THEME_OPTIONS = [
  { value: "light", label: "Yorug'" },
  { value: "dark", label: "Qorong'i" },
  { value: "system", label: "Tizim bo'yicha" },
];

const LANGUAGE_OPTIONS = APP_LANGUAGE_OPTIONS.map((language) => ({
  value: language.value,
  label: language.title,
}));

const PAYMENT_OPTIONS = [
  { value: "CASH", label: "Naqd" },
  { value: "CARD", label: "Karta" },
  { value: "BANK", label: "Bank" },
  { value: "QR", label: "QR" },
  { value: "DEBT", label: "Qarz" },
];

const safeValue = (value, options) =>
  options.some((option) => option.value === value) ? value : "";

const sections = [
  ["typography", "Matn"],
  ["interface", "Interfeys"],
  ["tables", "Jadvallar"],
  ["modules", "Bo'limlar"],
  ["terminology", "Terminologiya"],
  ["defaults", "Standartlar"],
  ["formats", "Formatlar"],
  ["behavior", "Xatti-harakat"],
  ["notifications", "Bildirishnomalar"],
  ["pos", "Savdo terminali"],
  ["warehouse", "Ombor"],
  ["manufacturing", "Ishlab chiqarish"],
  ["crm", "Mijozlar"],
  ["finance", "Moliya"],
  ["hr", "Xodimlar"],
  ["backup", "Tiklash / Yuklash / Eksport"],
];

const GeneralSettingsPage = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const settings = useSelector((state) => state.settings);
  const [query, setQuery] = useState("");
  const [selectedTableId, setSelectedTableId] = useState(TABLE_REGISTRY[0].id);
  const [resetOpen, setResetOpen] = useState(false);
  const [importError, setImportError] = useState("");

  const warehouses = useMemo(
    () => getStoredWarehouses().filter((item) => item.status !== "INACTIVE"),
    [],
  );
  const agents = useMemo(
    () => getStoredAgents().filter((item) => item.status === "ACTIVE"),
    [],
  );
  const customers = useMemo(
    () => getStoredCustomers().filter((item) => item.status !== "INACTIVE"),
    [],
  );
  const cashboxes = useMemo(
    () => getStoredCashboxes().filter((item) => item.active),
    [],
  );
  const shifts = useMemo(
    () => getStoredShifts().filter((item) => item.active !== false),
    [],
  );

  const selectedTable =
    TABLE_REGISTRY.find((table) => table.id === selectedTableId) ||
    TABLE_REGISTRY[0];

  const entityOptions = {
    warehouses: [
      { value: "", label: "Tanlanmagan" },
      ...warehouses.map((item) => ({ value: item.id, label: item.name })),
    ],
    agents: [
      { value: "", label: "Tanlanmagan" },
      ...agents.map((item) => ({ value: item.id, label: item.name || item.phone })),
    ],
    customers: [
      { value: "", label: "Tanlanmagan" },
      ...customers.map((item) => ({ value: item.id, label: item.name || item.phone })),
    ],
    cashboxes: [
      { value: "", label: "Tanlanmagan" },
      ...cashboxes.map((item) => ({ value: item.id, label: item.name })),
    ],
    shifts: [
      { value: "", label: "Tanlanmagan" },
      ...shifts.map((item) => ({ value: item.id, label: item.name })),
    ],
  };

  const update = (section, changes) => {
    dispatch(updateSection({ section, changes }));
  };

  const matchesSearch = (text) => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return true;
    }

    return text.toLowerCase().includes(normalized);
  };

  const downloadSettings = () => {
    const blob = new Blob([serializePlatformSettings(settings)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "universal-erp-settings.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      dispatch(importSettings(parsePlatformSettingsImport(text)));
      setImportError("");
    } catch (error) {
      setImportError(error.message || "Yuklangan fayl noto'g'ri.");
    } finally {
      event.target.value = "";
    }
  };

  const renderSection = (id, title, description, children, haystack = "") => {
    if (!matchesSearch(`${title} ${description} ${haystack}`)) {
      return null;
    }

    return (
      <section id={id} className="settings-page__section">
        <div className="settings-page__section-head">
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          {id !== "backup" && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw size={15} />}
              onClick={() =>
                id === "terminology"
                  ? dispatch(resetTerminology())
                  : dispatch(resetSection(id === "typography" || id === "interface" ? "appearance" : id))
              }
            >
              Bo'limni tiklash
            </Button>
          )}
        </div>
        {children}
      </section>
    );
  };

  return (
    <PageContainer
      title="Sozlamalar"
      description="Universal ERP platformasini biznesingiz terminlari, jadvallari va ish oqimlariga moslang."
    >
      <div className="settings-page">
        <div className="settings-page__topbar">
          <Input
            value={query}
            leftIcon={<Search size={16} />}
            placeholder="Sozlamalarni qidirish..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <nav aria-label="Sozlamalar bo'limlari">
            {sections.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
        </div>

        {renderSection(
          "typography",
          "Matn va shrift",
          "Platformadagi asosiy matn sozlamalari darhol yangilanadi.",
          <>
            <SettingRow title="Umumiy matn o'lchami" description="Kichik, standart, katta yoki juda katta ko'rinish.">
              <Select
                value={settings.appearance.fontSize}
                options={FONT_SIZE_OPTIONS}
                onChange={(event) =>
                  dispatch(updateAppearance({ fontSize: event.target.value }))
                }
              />
            </SettingRow>
            <SettingRow title="Oddiy matn qalinligi" description="Matnlar, maydon nomlari, kiritish maydonlari va tugmalar qalinligi.">
              <Select
                value={String(settings.appearance.bodyFontWeight)}
                options={WEIGHT_OPTIONS}
                onChange={(event) =>
                  dispatch(updateAppearance({ bodyFontWeight: Number(event.target.value) }))
                }
              />
            </SettingRow>
            <SettingRow title="Sarlavha qalinligi" description="Sahifa va bo'lim sarlavhalari qalinligi.">
              <Select
                value={String(settings.appearance.headingFontWeight)}
                options={WEIGHT_OPTIONS}
                onChange={(event) =>
                  dispatch(updateAppearance({ headingFontWeight: Number(event.target.value) }))
                }
              />
            </SettingRow>
            <SettingRow title="Jadval matni o'lchami" description="Barcha umumiy jadval matnlari o'lchami.">
              <Select
                value={String(settings.appearance.tableFontSize)}
                options={TABLE_SIZE_OPTIONS}
                onChange={(event) =>
                  dispatch(updateAppearance({ tableFontSize: Number(event.target.value) }))
                }
              />
            </SettingRow>
          </>,
          "font body heading table",
        )}

        {renderSection(
          "interface",
          "Interfeys",
          "Yumshoq ko'tarilgan dizayn uslubi, yon menyu va umumiy sahifa ritmini sozlash.",
          <>
            <SettingRow title="Interfeys zichligi" description="Jadval qatorlari, forma va ro'yxatlar oralig'i uchun umumiy zichlik.">
              <Segmented
                value={settings.appearance.density}
                options={DENSITY_OPTIONS}
                onChange={(value) => dispatch(updateAppearance({ density: value }))}
              />
            </SettingRow>
            <SettingRow title="Rang rejimi" description="Yorug', qorong'i yoki tizim sozlamasiga mos ko'rinish.">
              <Select
                value={settings.appearance.theme}
                options={THEME_OPTIONS}
                onChange={(event) => dispatch(updateAppearance({ theme: event.target.value }))}
              />
            </SettingRow>
            <SettingRow title="Burchak yumaloqligi" description="Boshqaruv elementlari va jadval burchaklari.">
              <Select
                value={settings.appearance.radiusScale}
                options={[
                  { value: "sharp", label: "Keskin" },
                  { value: "standard", label: "Standart" },
                  { value: "rounded", label: "Yumaloq" },
                ]}
                onChange={(event) => dispatch(updateAppearance({ radiusScale: event.target.value }))}
              />
            </SettingRow>
            <SettingRow title="Soya kuchi" description="Yumshoq ko'tarilgan dizayn soyalarining kuchi.">
              <Select
                value={settings.appearance.shadowStrength}
                options={[
                  { value: "low", label: "Past" },
                  { value: "normal", label: "Oddiy" },
                  { value: "strong", label: "Kuchli" },
                ]}
                onChange={(event) => dispatch(updateAppearance({ shadowStrength: event.target.value }))}
              />
            </SettingRow>
            <SettingRow title="Yon menyu eni" description="Katta ekrandagi yon menyu eni.">
              <Select
                value={settings.appearance.sidebarWidth}
                options={[
                  { value: "compact", label: "Ixcham" },
                  { value: "normal", label: "Oddiy" },
                ]}
                onChange={(event) => dispatch(updateAppearance({ sidebarWidth: event.target.value }))}
              />
            </SettingRow>
            <SettingRow title="Kontent kengligi" description="Katta ekranlarda sahifa kontenti kengligi.">
              <Select
                value={settings.appearance.contentMaxWidth}
                options={[
                  { value: "focused", label: "Jamlangan" },
                  { value: "wide", label: "Keng" },
                  { value: "fluid", label: "To'liq" },
                ]}
                onChange={(event) => dispatch(updateAppearance({ contentMaxWidth: event.target.value }))}
              />
            </SettingRow>
            <Preview />
          </>,
          "density radius shadow sidebar content preview",
        )}

        {renderSection(
          "tables",
          "Jadvallar",
          "Har bir real jadval uchun ustun tartibi, yashirish, eni va zichligini sozlash.",
          <>
            <SettingRow title="Sozlanadigan jadval" description="Mahsulotlar, mijozlar, savdo, xaridlar va boshqa jadvallar.">
              <Select
                value={selectedTableId}
                options={TABLE_REGISTRY.map((table) => ({
                  value: table.id,
                  label: table.label,
                }))}
                onChange={(event) => setSelectedTableId(event.target.value)}
              />
            </SettingRow>
            <TableSettingsPanel
              tableId={selectedTable.id}
              title={selectedTable.label}
              description="Ustunlarni yuqoriga yoki pastga ko'chiring, enini yozing yoki yashiring."
              columns={selectedTable.columns}
            />
          </>,
          "columns order hide show width sort page size",
        )}

        {renderSection(
          "modules",
          "Bo'limlar",
          "Yon menyu tartibi, nomi, belgisi va standart ochiladigan bo'lim.",
          <ModuleCustomizer
            settings={settings}
            onDefault={(value) => dispatch(setModulesDefault(value))}
            onChange={(moduleId, changes) =>
              dispatch(updateModuleSettings({ moduleId, changes }))
            }
          />,
          "yon menyu navigatsiya bo'lim yashirish tartib belgi standart",
        )}

        {renderSection(
          "terminology",
          "Terminologiya",
          "Asosiy biznes atamalari yon menyu, sahifa sarlavhalari va jadval ustunlarida ishlaydi.",
          <div className="settings-page__term-grid">
            {Object.entries(TERMINOLOGY_DEFAULTS).map(([key, fallback]) => (
              <Input
                key={key}
                label={fallback}
                value={settings.terminology[key] || ""}
                placeholder={fallback}
                onChange={(event) =>
                  dispatch(setTerminology({ key, value: event.target.value }))
                }
              />
            ))}
          </div>,
          "terminologiya mahsulot mijoz ombor qarz tannarx chiqindi",
        )}

        {renderSection(
          "defaults",
          "Standart qiymatlar",
          "Yangi jarayon ochilganda ishlatiladigan faol obyektlar va standart ko'rinishlar.",
          <>
            <SettingRow title="Standart ombor" description="Savdo terminali va ombor jarayonlari uchun.">
              <Select value={safeValue(settings.defaults.warehouseId, entityOptions.warehouses)} options={entityOptions.warehouses} onChange={(event) => dispatch(updateDefaults({ warehouseId: event.target.value }))} />
            </SettingRow>
            <SettingRow title="Standart agent" description="Savdo terminali va agentli savdolar uchun ixtiyoriy tanlov.">
              <Select value={safeValue(settings.defaults.agentId, entityOptions.agents)} options={entityOptions.agents} onChange={(event) => dispatch(updateDefaults({ agentId: event.target.value }))} />
            </SettingRow>
            <SettingRow title="Standart mijoz" description="Savdo terminali ochilganda avtomatik tanlanishi mumkin.">
              <Select value={safeValue(settings.defaults.customerId, entityOptions.customers)} options={entityOptions.customers} onChange={(event) => dispatch(updateDefaults({ customerId: event.target.value }))} />
            </SettingRow>
            <SettingRow title="Standart to'lov turi" description="Savdo terminali, moliya va xodimlar to'lov oynalari uchun.">
              <Select value={settings.defaults.paymentMethod} options={PAYMENT_OPTIONS} onChange={(event) => dispatch(updateDefaults({ paymentMethod: event.target.value }))} />
            </SettingRow>
            <SettingRow title="Standart kassa" description="Moliya va oylik to'lovi uchun.">
              <Select value={safeValue(settings.defaults.cashboxId, entityOptions.cashboxes)} options={entityOptions.cashboxes} onChange={(event) => dispatch(updateDefaults({ cashboxId: event.target.value }))} />
            </SettingRow>
            <SettingRow title="Standart sahifa hajmi" description="Sahifalangan ro'yxatlar uchun standart qator soni.">
              <Select value={String(settings.defaults.pageSize)} options={[10, 20, 30, 50].map((value) => ({ value: String(value), label: `${value}` }))} onChange={(event) => dispatch(updateDefaults({ pageSize: Number(event.target.value) }))} />
            </SettingRow>
            <SettingRow title="Standart savdo oynasi" description="Savdo ochilganda terminal yoki savdo tarixi.">
              <Select value={settings.defaults.salesTab} options={[{ value: "POS", label: "Terminal" }, { value: "History", label: "Savdo tarixi" }]} onChange={(event) => dispatch(updateDefaults({ salesTab: event.target.value }))} />
            </SettingRow>
          </>,
          "warehouse agent customer payment cashbox sales tab dashboard period",
        )}

        {renderSection(
          "formats",
          "Formatlar",
          "Sana, vaqt, pul, valyuta va aniqlik formatlari markaziy yordamchilar orqali ishlaydi.",
          <>
            <SettingRow title="Interfeys tili" description="Hozircha asosiy locale sifatida saqlanadi, to'liq tarjima tizimiga tayyor.">
              <Select
                value={settings.formats.language}
                options={LANGUAGE_OPTIONS}
                onChange={(event) => dispatch(updateFormats({ language: event.target.value }))}
              />
            </SettingRow>
            <SettingRow title="Sana formati" description="Sana ko'rinishi.">
              <Select value={settings.formats.dateFormat} options={[{ value: "DD.MM.YYYY", label: "DD.MM.YYYY" }, { value: "DD/MM/YYYY", label: "DD/MM/YYYY" }, { value: "YYYY-MM-DD", label: "YYYY-MM-DD" }]} onChange={(event) => dispatch(updateFormats({ dateFormat: event.target.value }))} />
            </SettingRow>
            <SettingRow title="Vaqt formati" description="24 soatlik yoki 12 soatlik ko'rinish.">
              <Select value={settings.formats.timeFormat} options={[{ value: "24h", label: "24h" }, { value: "12h", label: "12h" }]} onChange={(event) => dispatch(updateFormats({ timeFormat: event.target.value }))} />
            </SettingRow>
            <SettingRow title="Pul formati" description="1 250 000 so'm yoki 1,250,000 UZS ko'rinishi.">
              <Select value={settings.formats.moneyFormat} options={[{ value: "space-symbol", label: "1 250 000 so'm" }, { value: "comma-code", label: "1,250,000 UZS" }]} onChange={(event) => dispatch(updateFormats({ moneyFormat: event.target.value }))} />
            </SettingRow>
            <SettingRow title="Valyuta" description="Standart valyuta kodi.">
              <Select value={settings.formats.currency} options={[{ value: "UZS", label: "UZS" }, { value: "USD", label: "USD" }]} onChange={(event) => dispatch(updateFormats({ currency: event.target.value }))} />
            </SettingRow>
            <SettingRow title="Son aniqligi" description="Pul va umumiy sonlar uchun kasr xonalari.">
              <Select value={String(settings.formats.numberPrecision)} options={[0, 1, 2, 3].map((value) => ({ value: String(value), label: `${value}` }))} onChange={(event) => dispatch(updateFormats({ numberPrecision: Number(event.target.value) }))} />
            </SettingRow>
            <SettingRow title="Miqdor aniqligi" description="Kg/litr kabi miqdorlar uchun kasr xonalari.">
              <Select value={String(settings.formats.quantityPrecision)} options={[0, 1, 2, 3].map((value) => ({ value: String(value), label: `${value}` }))} onChange={(event) => dispatch(updateFormats({ quantityPrecision: Number(event.target.value) }))} />
            </SettingRow>
          </>,
          "date time money currency precision",
        )}

        {renderSection(
          "behavior",
          "Xatti-harakat",
          "Umumiy tasdiqlash oynalari va ish jarayoni odatlari. Kritik biznes qoidalar bu yerda o'chirilmaydi.",
          <SwitchGrid
            values={settings.behavior}
            items={[
              ["confirmDelete", "O'chirishni tasdiqlash", "O'chirishda tasdiq so'rash."],
              ["confirmCancel", "Bekor qilishni tasdiqlash", "Bekor qilishda tasdiq so'rash."],
              ["confirmDangerous", "Xavfli amalni tasdiqlash", "Xavfli amallarda qo'shimcha tasdiq."],
              ["autosaveForms", "Formalarni avtomatik saqlash", "Qoralama forma qiymatlarini saqlash."],
              ["rememberFilters", "Filtrlarni eslab qolish", "Filtrlarni mahalliy xotirada saqlash."],
              ["rememberLastOpenedModule", "Oxirgi bo'limni eslab qolish", "Oxirgi ochilgan bo'limni eslab qolish."],
              ["allowCompletedRecordEditing", "Yakunlangan yozuvni tahrirlash", "Yakunlangan yozuvlarda tahrirlash odati."],
            ]}
            onChange={(changes) => dispatch(updateBehavior(changes))}
          />,
          "delete cancel dangerous autosave filters detail completed",
        )}

        {renderSection(
          "notifications",
          "Bildirishnomalar",
          "Mavjud boshqaruv paneli va ogohlantirish signallari bu sozlamalarni hurmat qiladi.",
          <SwitchGrid
            values={settings.notifications}
            items={[
              ["lowStockWarning", "Kam qoldiq ogohlantirishi", "Kam qoldiq signali."],
              ["outOfStockWarning", "Tugagan mahsulot ogohlantirishi", "Tugagan mahsulot signali."],
              ["customerDebtWarning", "Mijoz qarzi ogohlantirishi", "Mijoz qarzi signali."],
              ["supplierDebtWarning", "Yetkazib beruvchi qarzi ogohlantirishi", "Yetkazib beruvchi qarzi signali."],
              ["latePurchaseWarning", "Kechikkan xarid ogohlantirishi", "Kechikkan xarid signali."],
              ["productionShortageWarning", "Xomashyo yetishmasligi ogohlantirishi", "Xomashyo yetishmasligi signali."],
              ["overdueCrmFollowUp", "Kechikkan mijoz aloqasi", "Mijoz bilan aloqa eslatmasi."],
              ["payrollDebtWarning", "Oylik qarzi ogohlantirishi", "Oylik qarzi signali."],
              ["lateEmployeeWarning", "Kechikkan xodim ogohlantirishi", "Kechikkan xodim signali."],
              ["sound", "Bildirishnoma ovozi", "Ichki bildirishnoma ovozi sozlamasi."],
            ]}
            onChange={(changes) => dispatch(updateNotifications(changes))}
          />,
          "low stock debt supplier purchase production crm payroll employee sound",
        )}

        {renderSection(
          "pos",
          "Savdo terminali",
          "Savdo terminali standartlari, chek va qarz/chegirma qoidalari.",
          <>
            <SettingRow title="Standart ombor" description="Savdo terminali ochilganda avtomatik tanlanadi.">
              <Select value={safeValue(settings.pos.defaultWarehouseId || settings.defaults.warehouseId, entityOptions.warehouses)} options={entityOptions.warehouses} onChange={(event) => update("pos", { defaultWarehouseId: event.target.value })} />
            </SettingRow>
            <SettingRow title="Standart mijoz" description="Savdo terminali ochilganda avtomatik tanlanadigan ixtiyoriy mijoz.">
              <Select value={safeValue(settings.pos.defaultCustomerId, entityOptions.customers)} options={entityOptions.customers} onChange={(event) => update("pos", { defaultCustomerId: event.target.value })} />
            </SettingRow>
            <SettingRow title="Standart agent" description="Savdo terminali ochilganda avtomatik tanlanadigan ixtiyoriy agent.">
              <Select value={safeValue(settings.pos.defaultAgentId, entityOptions.agents)} options={entityOptions.agents} onChange={(event) => update("pos", { defaultAgentId: event.target.value })} />
            </SettingRow>
            <SettingRow title="Standart to'lov turi" description="To'lov oynasining birinchi qatori.">
              <Select value={settings.pos.defaultPaymentMethod} options={PAYMENT_OPTIONS} onChange={(event) => update("pos", { defaultPaymentMethod: event.target.value })} />
            </SettingRow>
            <SettingRow title="Chek eni" description="Chop etish va ko'rinish namunasi eni.">
              <Select value={settings.pos.receiptWidth} options={[{ value: "58mm", label: "58mm" }, { value: "80mm", label: "80mm" }]} onChange={(event) => update("pos", { receiptWidth: event.target.value })} />
            </SettingRow>
            <SettingRow title="Chek sarlavhasi" description="Chek tepasidagi nom.">
              <Input value={settings.pos.receiptHeader} onChange={(event) => update("pos", { receiptHeader: event.target.value })} />
            </SettingRow>
            <SettingRow title="Chek pastki matni" description="Chek pastidagi matn.">
              <Input value={settings.pos.receiptFooter} onChange={(event) => update("pos", { receiptFooter: event.target.value })} />
            </SettingRow>
            <SettingRow title="Eng katta chegirma foizi" description="Foizli chegirma chegarasi.">
              <Input type="number" min="0" max="100" value={settings.pos.maxDiscountPercent} onChange={(event) => update("pos", { maxDiscountPercent: Number(event.target.value) })} />
            </SettingRow>
            <SwitchGrid
              values={settings.pos}
              items={[
                ["barcodeEnterAutoAdd", "Shtrix-kod bilan qo'shish", "Aniq shtrix-kod yoki SKU kiritilganda savatchaga qo'shish."],
                ["clearCartConfirmation", "Savatchani tozalashni tasdiqlash", "Savatchani tozalashda tasdiq so'rash."],
                ["showCustomerOnReceipt", "Chekda mijozni ko'rsatish", "Chekda mijoz nomini ko'rsatish."],
                ["showAgentOnReceipt", "Chekda agentni ko'rsatish", "Chekda agent nomini ko'rsatish."],
                ["allowDiscount", "Chegirmaga ruxsat", "Savdo terminalida chegirma maydonlarini yoqish."],
                ["allowDebtSales", "Qarzga sotuvga ruxsat", "Qarzga sotuvga ruxsat berish."],
                ["requireCustomerForDebt", "Qarz uchun mijoz shart", "Qarz qolsa mijoz tanlash majburiy."],
                ["autoPrintReceipt", "Chekni avtomatik chiqarish", "Savdo tugaganda chop etish oynasini ochish."],
              ]}
              onChange={(changes) => update("pos", changes)}
            />
          </>,
          "pos receipt barcode discount debt customer agent print",
        )}

        <DomainSections
          settings={settings}
          entityOptions={entityOptions}
          update={update}
          renderSection={renderSection}
        />

        {renderSection(
          "backup",
          "Tiklash / Yuklash / Eksport",
          "Biznes konfiguratsiyasini JSON sifatida zaxiralash yoki ko'chirish.",
          <div className="settings-page__backup">
            <Button leftIcon={<Download size={16} />} onClick={downloadSettings}>
              JSON eksport
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Upload size={16} />}
              onClick={() => fileInputRef.current?.click()}
            >
              JSON yuklash
            </Button>
            <Button
              variant="danger"
              leftIcon={<RotateCcw size={16} />}
              onClick={() => setResetOpen(true)}
            >
              Barcha sozlamalarni tiklash
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={importFile}
            />
            {importError && <span className="settings-page__error">{importError}</span>}
          </div>,
          "export import reset json backup migrate",
        )}
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Barcha sozlamalar tiklansinmi?"
        description="Bu amal barcha moslashtirishlarni standart holatga qaytaradi."
        confirmText="Tiklash"
        danger
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          dispatch(resetAllSettings());
          setResetOpen(false);
        }}
      />
    </PageContainer>
  );
};

const SettingRow = ({ title, description, children }) => (
  <div className="settings-page__row">
    <div className="settings-page__row-info">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
    <div className="settings-page__control">{children}</div>
  </div>
);

const Segmented = ({ value, options, onChange }) => (
  <div className="settings-page__segments">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        className={value === option.value ? "active" : ""}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const SwitchGrid = ({ values, items, onChange }) => (
  <div className="settings-page__switch-grid">
    {items.map(([key, label, description]) => (
      <Switch
        key={key}
        checked={Boolean(values[key])}
        label={label}
        description={description}
        onChange={(event) => onChange({ [key]: event.target.checked })}
      />
    ))}
  </div>
);

const Preview = () => (
  <div className="settings-page__preview">
    <span>Jonli namuna</span>
    <h2>Mahsulotlar</h2>
    <p>Sarlavha, matn, kiritish maydoni, tugma va kichik jadval real sozlama o'zgaruvchilari orqali ko'rinadi.</p>
    <div className="settings-page__preview-controls">
      <Input placeholder="SKU yoki nom" />
      <Button leftIcon={<Settings2 size={16} />}>Saqlash</Button>
    </div>
    <div className="settings-page__preview-table">
      <span>Mahsulot</span>
      <span>Qoldiq</span>
      <span>Narx</span>
      <strong>Shokoladli pechenye</strong>
      <span>125 dona</span>
      <span>18 000 so'm</span>
    </div>
  </div>
);

const ModuleCustomizer = ({ settings, onDefault, onChange }) => {
  const merged = mergeNavigationSettings({
    items: navigationItems,
    modules: settings.modules,
    terminology: settings.terminology,
    language: settings.formats?.language,
  });

  const move = (moduleId, direction) => {
    const index = merged.findIndex((item) => item.id === moduleId);
    const target = direction === "up" ? index - 1 : index + 1;

    if (target < 0 || target >= merged.length) {
      return;
    }

    onChange(merged[index].id, { order: merged[target].order });
    onChange(merged[target].id, { order: merged[index].order });
  };

  return (
    <>
      <SettingRow title="Standart ochiladigan bo'lim" description="Kirish yoki bosh sahifaga yo'naltirish uchun sozlama.">
        <Select
          value={settings.modules.defaultModule || "dashboard"}
          options={merged.map((item) => ({ value: item.id, label: item.label }))}
          onChange={(event) => onDefault(event.target.value)}
        />
      </SettingRow>
      <div className="settings-page__module-list">
        {merged.map((item, index) => {
          const custom = settings.modules.items?.[item.id] || {};

          return (
            <div key={item.id} className="settings-page__module-row">
              <Switch
                checked={!custom.hidden}
                label={item.label}
                description={item.path}
                onChange={(event) => onChange(item.id, { hidden: !event.target.checked })}
              />
              <Input
                value={custom.label || ""}
                placeholder={item.label}
                onChange={(event) => onChange(item.id, { label: event.target.value })}
              />
              <Select
                value={custom.icon || item.icon}
                options={MODULE_ICON_OPTIONS.map((icon) => ({
                  value: icon,
                  label: MODULE_ICON_LABELS[icon] || icon,
                }))}
                onChange={(event) => onChange(item.id, { icon: event.target.value })}
              />
              <div className="settings-page__module-actions">
                <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => move(item.id, "up")}>
                  Yuqori
                </Button>
                <Button size="sm" variant="ghost" disabled={index === merged.length - 1} onClick={() => move(item.id, "down")}>
                  Past
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const DomainSections = ({ settings, entityOptions, update, renderSection }) => (
  <>
    {renderSection(
      "warehouse",
      "Ombor",
      "Qoldiq ogohlantirishi, harakat tasdiqlashi va ombor standartlari.",
      <>
        <SettingRow title="Standart ombor" description="Ombor modulida standart tanlov.">
          <Select value={safeValue(settings.warehouse.defaultWarehouseId, entityOptions.warehouses)} options={entityOptions.warehouses} onChange={(event) => update("warehouse", { defaultWarehouseId: event.target.value })} />
        </SettingRow>
        <SettingRow title="Manfiy qoldiq qoidasi" description="Xavfsizlik uchun manfiy qoldiq bloklangan biznes qoida bo'lib qoladi.">
          <Select value={settings.warehouse.negativeStockPolicy} disabled options={[{ value: "blocked", label: "Bloklangan" }]} />
        </SettingRow>
        <SwitchGrid
          values={settings.warehouse}
          items={[
            ["lowStockWarning", "Kam qoldiq ogohlantirishi", "Kam qoldiq signali."],
            ["reservedStockVisible", "Band qoldiq ko'rinsin", "Band qilingan qoldiqni ko'rsatish."],
            ["stockMovementConfirmation", "Qoldiq harakatini tasdiqlash", "Kirim/chiqimda tasdiq so'rash."],
          ]}
          onChange={(changes) => update("warehouse", changes)}
        />
      </>,
      "ombor qoldiq band manfiy harakat",
    )}

    {renderSection(
      "manufacturing",
      "Ishlab chiqarish",
      "Ishlab chiqarish bosqichlari, sifat nazorati va yakunlash xavfsizligi sozlamalari.",
      <>
        <SettingRow title="Standart ishlab chiqarish ombori" description="Yangi ishlab chiqarish buyurtmasi uchun standart ombor.">
          <Select value={safeValue(settings.manufacturing.defaultProductionWarehouseId, entityOptions.warehouses)} options={entityOptions.warehouses} onChange={(event) => update("manufacturing", { defaultProductionWarehouseId: event.target.value })} />
        </SettingRow>
        <SettingRow title="Standart tarkib holati" description="Yangi mahsulot tarkibi uchun standart holat.">
          <Select value={settings.manufacturing.defaultBomStatus} options={[{ value: "DRAFT", label: "Qoralama" }, { value: "ACTIVE", label: "Faol" }]} onChange={(event) => update("manufacturing", { defaultBomStatus: event.target.value })} />
        </SettingRow>
        <SettingRow title="Brak ogohlantirish chegarasi" description="Foiz.">
          <Input type="number" min="0" value={settings.manufacturing.defectWarningThreshold} onChange={(event) => update("manufacturing", { defectWarningThreshold: Number(event.target.value) })} />
        </SettingRow>
        <SettingRow title="Chiqindi ogohlantirish chegarasi" description="Foiz.">
          <Input type="number" min="0" value={settings.manufacturing.wasteWarningThreshold} onChange={(event) => update("manufacturing", { wasteWarningThreshold: Number(event.target.value) })} />
        </SettingRow>
        <SwitchGrid
          values={settings.manufacturing}
          items={[
            ["qualityControlRequired", "Sifat nazorati majburiy", "Yakunlashdan oldin sifat nazorati talab qilinsin."],
            ["productionStagesRequired", "Bosqichlar majburiy", "Bosqichlar tugamasdan yakunlash bloklanadi."],
            ["blockCompletionIfQcFail", "Sifat nazorati o'tmasa bloklash", "Sifat nazorati rad etilsa yakunlash bloklanadi."],
            ["autoReserveOnStartProduction", "Boshlaganda avtomatik band qilish", "Ishlab chiqarish boshlanganda material band qilinsin."],
          ]}
          onChange={(changes) => update("manufacturing", changes)}
        />
      </>,
      "ishlab chiqarish sifat nazorati bosqich brak chiqindi tarkib band",
    )}

    {renderSection(
      "crm",
      "Mijozlar bilan ishlash",
      "Mijoz standartlari, takror telefon va kredit qoidalari.",
      <>
        <SettingRow title="Standart mijoz toifasi" description="Yangi mijoz uchun standart toifa.">
          <Select value={settings.crm.defaultCustomerSegment} options={[
            { value: "VIP", label: "VIP" },
            { value: "REGULAR", label: "Doimiy" },
            { value: "NEW", label: "Yangi" },
            { value: "RISK", label: "Xavfli" },
          ]} onChange={(event) => update("crm", { defaultCustomerSegment: event.target.value })} />
        </SettingRow>
        <SettingRow title="Standart kredit limiti" description="Yangi mijoz uchun kredit limiti.">
          <Input type="number" min="0" value={settings.crm.defaultCreditLimit} onChange={(event) => update("crm", { defaultCreditLimit: Number(event.target.value) })} />
        </SettingRow>
        <SettingRow title="Takror telefon qoidasi" description="Ogohlantirish yoki bloklash.">
          <Select value={settings.crm.duplicatePhoneBehavior} options={[{ value: "warning", label: "Ogohlantirish" }, { value: "block", label: "Bloklash" }]} onChange={(event) => update("crm", { duplicatePhoneBehavior: event.target.value })} />
        </SettingRow>
        <SettingRow title="Standart aloqa muddati" description="Kechikkan mijoz aloqasini hisoblash uchun kunlar soni.">
          <Input type="number" min="1" value={settings.crm.defaultFollowUpDays} onChange={(event) => update("crm", { defaultFollowUpDays: Number(event.target.value) })} />
        </SettingRow>
        <SwitchGrid
          values={settings.crm}
          items={[
            ["overdueFollowUpWarning", "Kechikkan aloqa ogohlantirishi", "Kechikkan mijoz aloqasi signali."],
            ["customerScoreVisible", "Mijoz reytingi ko'rinsin", "Mijoz reytingini ko'rsatish."],
            ["creditLimitCheckEnabled", "Kredit limit tekshiruvi", "Savdo qarzi limitini tekshirish."],
          ]}
          onChange={(changes) => update("crm", changes)}
        />
      </>,
      "mijoz takror telefon kredit limit aloqa reyting",
    )}

    {renderSection(
      "finance",
      "Moliya",
      "Kassa, to'lov turi, tasdiqlash va davr standartlari.",
      <>
        <SettingRow title="Standart kassa" description="Moliya oynalari uchun standart kassa.">
          <Select value={safeValue(settings.finance.defaultCashboxId, entityOptions.cashboxes)} options={entityOptions.cashboxes} onChange={(event) => update("finance", { defaultCashboxId: event.target.value })} />
        </SettingRow>
        <SettingRow title="Standart to'lov turi" description="Moliya to'lov formalari uchun.">
          <Select value={settings.finance.defaultPaymentMethod} options={PAYMENT_OPTIONS} onChange={(event) => update("finance", { defaultPaymentMethod: event.target.value })} />
        </SettingRow>
        <SettingRow title="Qarz ogohlantirish chegarasi" description="Qarz belgisini xavfli ko'rsatish chegarasi.">
          <Input type="number" min="0" value={settings.finance.debtWarningThreshold} onChange={(event) => update("finance", { debtWarningThreshold: Number(event.target.value) })} />
        </SettingRow>
        <SettingRow title="Standart moliya davri" description="Moliya boshqaruv paneli uchun standart davr.">
          <Select value={settings.finance.defaultFinancePeriod} options={[{ value: "today", label: "Bugun" }, { value: "week", label: "Hafta" }, { value: "month", label: "Oy" }, { value: "year", label: "Yil" }]} onChange={(event) => update("finance", { defaultFinancePeriod: event.target.value })} />
        </SettingRow>
        <SwitchGrid
          values={settings.finance}
          items={[
            ["expenseConfirmation", "Xarajatni tasdiqlash", "Xarajat saqlashda tasdiq so'rash."],
            ["supplierPaymentConfirmation", "Yetkazib beruvchi to'lovini tasdiqlash", "Yetkazib beruvchi to'lovida tasdiq so'rash."],
            ["customerPaymentConfirmation", "Mijoz to'lovini tasdiqlash", "Mijoz to'lovida tasdiq so'rash."],
            ["showZeroBalances", "Nol qoldiqlar ko'rinsin", "0 qoldiqli kassalarni ko'rsatish."],
          ]}
          onChange={(changes) => update("finance", changes)}
        />
      </>,
      "moliya kassa to'lov qarz xarajat yetkazib beruvchi mijoz nol qoldiq",
    )}

    {renderSection(
      "hr",
      "Xodimlar",
      "Smena, kechikish chegarasi, maosh turi va oylik sozlamalari.",
      <>
        <SettingRow title="Standart smena" description="Yangi xodim formasi uchun.">
          <Select value={safeValue(settings.hr.defaultShiftId, entityOptions.shifts)} options={entityOptions.shifts} onChange={(event) => update("hr", { defaultShiftId: event.target.value })} />
        </SettingRow>
        <SettingRow title="Kechikish chegarasi" description="Davomat ogohlantirishi uchun daqiqa chegarasi.">
          <Input type="number" min="0" value={settings.hr.lateThresholdMinutes} onChange={(event) => update("hr", { lateThresholdMinutes: Number(event.target.value) })} />
        </SettingRow>
        <SettingRow title="Standart maosh turi" description="Yangi xodim formasi uchun.">
          <Select value={settings.hr.defaultSalaryType} options={[{ value: "MONTHLY", label: "Oylik" }, { value: "DAILY", label: "Kunlik" }, { value: "HOURLY", label: "Soatlik" }]} onChange={(event) => update("hr", { defaultSalaryType: event.target.value })} />
        </SettingRow>
        <SwitchGrid
          values={settings.hr}
          items={[
            ["payrollPaymentConfirmation", "Oylik to'lovini tasdiqlash", "Oylik to'lovida tasdiq so'rash."],
            ["attendanceWarning", "Davomat ogohlantirishi", "Davomat bo'yicha ogohlantirish."],
            ["leaveWarning", "Ta'til ogohlantirishi", "Ta'til bo'yicha ogohlantirish."],
          ]}
          onChange={(changes) => update("hr", changes)}
        />
      </>,
      "xodim smena kechikish maosh oylik davomat ta'til",
    )}
  </>
);

export default GeneralSettingsPage;
