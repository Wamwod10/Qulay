import { useEffect, useState } from "react";

import { CheckCircle2, LoaderCircle } from "lucide-react";

import { Card, LiveIcon, Switch } from "../../../../shared/ui";
import { translateText } from "../../../../localization/i18n";

import {
  getSuperAdminUserModules,
  updateSuperAdminUserModule,
} from "../../services/superAdminApi";

import "./AccountModulesManager.scss";

const MODULES = [
  {
    key: "dashboard",
    name: "Bosh sahifa",
  },
  {
    key: "sales",
    name: "Savdo",
  },
  {
    key: "products",
    name: "Mahsulotlar",
  },
  {
    key: "warehouse",
    name: "Ombor",
  },
  {
    key: "purchases",
    name: "Xaridlar",
  },
  {
    key: "suppliers",
    name: "Yetkazib beruvchilar",
  },
  {
    key: "customers",
    name: "Mijozlar",
  },
  {
    key: "agents",
    name: "Agentlar",
  },
  {
    key: "manufacturing",
    name: "Ishlab chiqarish",
  },
  {
    key: "finance",
    name: "Moliya",
  },
  {
    key: "employees",
    name: "Xodimlar",
  },
  {
    key: "reports",
    name: "Hisobotlar",
  },
];

const AccountModulesManager = ({ user }) => {
  const [modules, setModules] = useState({});

  const [loading, setLoading] = useState(true);

  const [updating, setUpdating] = useState("");

  const accountId = user.businessId || user.companyId || null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      if (!accountId) {
        setModules({});
        setLoading(false);
        return;
      }

      try {
        const result = await getSuperAdminUserModules(accountId);

        setModules(normalizeModules(result));
      } catch {
        setModules({});
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [accountId]);

  const handleToggle = async (moduleKey, checked) => {
    if (!accountId) {
      return;
    }

    const previous = modules[moduleKey];

    setModules((current) => ({
      ...current,
      [moduleKey]: checked,
    }));

    setUpdating(moduleKey);

    try {
      await updateSuperAdminUserModule(accountId, moduleKey, checked);
    } catch (error) {
      setModules((current) => ({
        ...current,
        [moduleKey]: previous,
      }));

      window.alert(error.message || translateText("Bo'lim holatini o'zgartirib bo'lmadi."));
    } finally {
      setUpdating("");
    }
  };

  return (
    <Card padding="lg" className="account-modules-manager">
      <div className="account-modules-manager__header">
        <div>
          <h3>{translateText("Akkaunt bo'limlari")}</h3>

          <p>
            {translateText("Aynan shu akkaunt uchun platforma bo'limlarini yoqing yoki yashiring.")}
          </p>
        </div>

        {!loading && (
          <span>
            <LiveIcon icon={CheckCircle2} motion="success-pop" size={16} />
            {translateText("Saqlanadi")}
          </span>
        )}
      </div>

      {loading ? (
        <div className="account-modules-manager__loading">
          <LiveIcon icon={LoaderCircle} motion="spin-slow" />
          {translateText("Bo'limlar yuklanmoqda...")}
        </div>
      ) : (
        <div className="account-modules-manager__list">
          {MODULES.map((module) => {
            const enabled = modules[module.key] ?? true;

            return (
              <div key={module.key} className="account-modules-manager__item">
                <div>
                  <strong>{module.name}</strong>

                  <span>{module.key}</span>
                </div>

                <div className="account-modules-manager__switch">
                  {updating === module.key && (
                    <LiveIcon
                      icon={LoaderCircle}
                      motion="spin-slow"
                      size={15}
                    />
                  )}

                  <Switch
                    checked={enabled}
                    disabled={!accountId || updating === module.key}
                    onChange={(event) =>
                      handleToggle(module.key, event.target.checked)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

const normalizeModules = (result) => {
  if (!result) {
    return {};
  }

  if (Array.isArray(result)) {
    return Object.fromEntries(
      result.map((item) => [
        item.moduleKey || item.key,
        item.enabled !== false,
      ]),
    );
  }

  if (Array.isArray(result.modules)) {
    return normalizeModules(result.modules);
  }

  return result.modules || result;
};

export default AccountModulesManager;
