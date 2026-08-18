import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  RefreshCcw,
  Settings2,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Card, LiveIcon, Switch } from "../../../../shared/ui";

import {
  getGlobalModules,
  updateGlobalModule,
} from "../../services/superAdminApi";

import "./ModulesPage.scss";

const PLATFORM_MODULES = [
  {
    key: "dashboard",
    name: "Bosh sahifa",
    description: "Platformaning asosiy dashboard sahifasi.",
    locked: true,
  },
  {
    key: "sales",
    name: "Savdo",
    description: "POS Terminal va savdo tarixini boshqaradi.",
  },
  {
    key: "products",
    name: "Mahsulotlar",
    description: "Mahsulotlar katalogi va narxlar.",
  },
  {
    key: "warehouse",
    name: "Ombor",
    description: "Qoldiq, rezerv va ombor harakatlari.",
  },
  {
    key: "purchases",
    name: "Xaridlar",
    description: "Yetkazib beruvchilardan xaridlar.",
  },
  {
    key: "suppliers",
    name: "Yetkazib beruvchilar",
    description: "Supplier ma’lumotlari va xarid aloqalari.",
  },
  {
    key: "customers",
    name: "Mijozlar / CRM",
    description: "Mijozlar, qarz va follow-up boshqaruvi.",
  },
  {
    key: "agents",
    name: "Agentlar",
    description: "Savdo agentlari va ularning natijalari.",
  },
  {
    key: "manufacturing",
    name: "Ishlab chiqarish",
    description: "BOM, production order va tannarx.",
  },
  {
    key: "finance",
    name: "Moliya",
    description: "Kirim, chiqim, qarz va kassa.",
  },
  {
    key: "employees",
    name: "Xodimlar",
    description: "HR, attendance, payroll va smenalar.",
  },
  {
    key: "reports",
    name: "Hisobotlar",
    description: "Savdo, moliya, ishlab chiqarish va CRM hisobotlari.",
  },
  {
    key: "settings",
    name: "Sozlamalar",
    description: "Platformaning umumiy sozlamalari.",
    locked: true,
  },
];

const ModulesPage = () => {
  const [modules, setModules] = useState({});

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [updating, setUpdating] = useState("");

  const loadModules = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getGlobalModules();

      setModules(normalizeModules(result));

      setError("");
    } catch (err) {
      setError(err.message || "Global bo‘limlarni yuklab bo‘lmadi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const stats = useMemo(() => {
    const enabled = PLATFORM_MODULES.filter(
      (module) => module.locked || modules[module.key] !== false,
    ).length;

    return {
      total: PLATFORM_MODULES.length,

      enabled,

      disabled: PLATFORM_MODULES.length - enabled,
    };
  }, [modules]);

  const handleToggle = async (module, enabled) => {
    if (module.locked) {
      return;
    }

    const previous = modules[module.key] !== false;

    setModules((current) => ({
      ...current,

      [module.key]: enabled,
    }));

    setUpdating(module.key);

    try {
      await updateGlobalModule(module.key, enabled);
    } catch (err) {
      setModules((current) => ({
        ...current,

        [module.key]: previous,
      }));

      window.alert(err.message || "Bo‘lim holatini o‘zgartirib bo‘lmadi.");
    } finally {
      setUpdating("");
    }
  };

  return (
    <div className="sa-modules">
      <header className="sa-modules__header">
        <div>
          <h1>Platforma bo‘limlari</h1>

          <p>Butun platforma bo‘yicha modullarni yoqing yoki o‘chiring.</p>
        </div>

        <Button
          variant="secondary"
          leftIcon={<RefreshCcw size={16} />}
          onClick={loadModules}
        >
          Yangilash
        </Button>
      </header>

      <section className="sa-modules__stats">
        <ModuleStat
          label="Jami bo‘lim"
          value={stats.total}
          icon={<Settings2 size={19} />}
        />

        <ModuleStat
          label="Yoqilgan"
          value={stats.enabled}
          icon={<CheckCircle2 size={19} />}
        />

        <ModuleStat
          label="O‘chirilgan"
          value={stats.disabled}
          icon={<AlertTriangle size={19} />}
        />
      </section>

      <Card padding="lg" className="sa-modules__content">
        <div className="sa-modules__info">
          <AlertTriangle size={17} />

          <span>
            Global bo‘lim o‘chirilsa, u barcha kompaniya va akkauntlarda
            yashiriladi. Account-level setting global OFF holatini qayta yoqa
            olmaydi.
          </span>
        </div>

        {error && <div className="sa-modules__error">{error}</div>}

        {loading ? (
          <div className="sa-modules__loading">
            <LiveIcon icon={LoaderCircle} motion="spin-slow" />
            Bo‘limlar yuklanmoqda...
          </div>
        ) : (
          <div className="sa-modules__list">
            {PLATFORM_MODULES.map((module) => {
              const enabled = module.locked
                ? true
                : modules[module.key] !== false;

              const isUpdating = updating === module.key;

              return (
                <div
                  key={module.key}
                  className={[
                    "sa-modules__row",

                    !enabled ? "sa-modules__row--disabled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="sa-modules__module">
                    <div className="sa-modules__module-icon">
                      {enabled ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <AlertTriangle size={18} />
                      )}
                    </div>

                    <div>
                      <strong>{module.name}</strong>

                      <span>{module.description}</span>

                      <small>{module.key}</small>
                    </div>
                  </div>

                  <div className="sa-modules__control">
                    {module.locked && (
                      <span className="sa-modules__locked">Majburiy</span>
                    )}

                    {isUpdating && (
                      <LiveIcon
                        icon={LoaderCircle}
                        motion="spin-slow"
                        size={15}
                      />
                    )}

                    <Switch
                      checked={enabled}
                      disabled={module.locked || isUpdating}
                      onChange={(event) =>
                        handleToggle(module, event.target.checked)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

const ModuleStat = ({ icon, label, value }) => (
  <Card padding="md" className="sa-modules__stat">
    <div className="sa-modules__stat-icon">{icon}</div>

    <div>
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  </Card>
);

const normalizeModules = (result) => {
  if (!result) {
    return {};
  }

  if (Array.isArray(result)) {
    return Object.fromEntries(
      result
        .filter(Boolean)
        .map((item) => [item.moduleKey || item.key, item.enabled !== false]),
    );
  }

  if (Array.isArray(result.modules)) {
    return normalizeModules(result.modules);
  }

  return result.modules || result;
};

export default ModulesPage;
