import { useEffect, useMemo, useRef, useState } from "react";

import {
  Bell,
  ChevronDown,
  Factory,
  Globe2,
  Keyboard,
  LogOut,
  Maximize2,
  Minimize2,
  Moon,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShoppingCart,
  Sun,
  Users,
} from "lucide-react";

import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import LiveIcon from "../../../../shared/ui/LiveIcon/LiveIcon";

import useCompany from "../../../../hooks/useCompany";
import useCurrentUser from "../../../../hooks/useCurrentUser";

import { logout } from "../../../../store/slices/authSlice";
import authService from "../../../../modules/auth/services/authService";
import {
  updateAppearance,
  updateFormats,
} from "../../../../store/slices/settingsSlice";
import { translateText } from "../../../../localization/i18n";
import {
  LANGUAGE_OPTIONS,
  normalizeLanguage,
} from "../../../../localization/languages";

import { getStoredAgents } from "../../../../modules/agents/utils/agentsStorage";
import {
  getCustomerDisplayName,
  getStoredCustomerFollowUps,
  getStoredCustomers,
} from "../../../../modules/customers/utils/customersStorage";
import { getHrSummary } from "../../../../modules/employees/utils/hrStorage";
import {
  formatFinanceMoney,
  getCustomerDebts,
  getSupplierDebts,
} from "../../../../modules/finance/utils/financeSelectors";
import { checkMaterialAvailability } from "../../../../modules/manufacturing/production-orders/utils/materialAvailability";
import { getStoredProductionOrders } from "../../../../modules/manufacturing/utils/manufacturingStorage";
import { getStoredProducts } from "../../../../modules/products/utils/productsStorage";
import { getStockStatus } from "../../../../modules/products/utils/productHelpers";
import { getStoredPurchases } from "../../../../modules/purchases/utils/purchasesStorage";
import { getStoredSales } from "../../../../modules/sales/utils/salesStorage";
import {
  useAppearanceSettings,
  useFormatSettings,
  useNotificationSettings,
} from "../../../../modules/settings/selectors/settingsSelectors";
import { getStoredSuppliers } from "../../../../modules/suppliers/utils/suppliersStorage";

import "./Header.scss";

const SEARCH_LIMIT = 8;

const QUICK_ADD_ITEMS = [
  { label: "Yangi savdo", path: "/sales/terminal", icon: ShoppingCart },
  { label: "Yangi mijoz", path: "/customers/create", icon: Users },
  { label: "Yangi xarid", path: "/purchases/create", icon: ReceiptText },
  { label: "Yangi xarajat", path: "/finance/expenses?modal=expense", icon: ReceiptText },
  { label: "Yangi ishlab chiqarish", path: "/manufacturing/orders/create", icon: Factory },
];

const normalizeText = (value) => String(value || "").toLowerCase();

const matchesQuery = (query, ...values) =>
  values.some((value) => normalizeText(value).includes(query));

const todayIso = () => new Date().toISOString().slice(0, 10);

const isPastDate = (value) => {
  if (!value) {
    return false;
  }

  return String(value).slice(0, 10) < todayIso();
};

const hasEnoughMaterials = (availability = []) =>
  availability.every((material) => material.enough);

const getSearchResults = (query) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const results = [];

  getStoredProducts().forEach((product) => {
    if (matchesQuery(normalizedQuery, product.name, product.sku, product.barcode, product.category)) {
      results.push({
        id: `product-${product.id}`,
        title: product.name || "Mahsulot",
        type: "Mahsulot",
        description: [product.sku, product.category, product.stock ? `${product.stock} ${product.unit || ""}` : ""]
          .filter(Boolean)
          .join(" / "),
        path: `/products/${product.id}`,
      });
    }
  });

  getStoredCustomers().forEach((customer) => {
    const name = getCustomerDisplayName(customer);

    if (matchesQuery(normalizedQuery, name, customer.phone, customer.companyName, customer.email)) {
      results.push({
        id: `customer-${customer.id}`,
        title: name,
        type: "Mijoz",
        description: [customer.phone, customer.segment, customer.status].filter(Boolean).join(" / "),
        path: `/customers/${customer.id}`,
      });
    }
  });

  getStoredSales().forEach((sale) => {
    if (matchesQuery(normalizedQuery, sale.number, sale.customerName, sale.agentName, sale.total)) {
      results.push({
        id: `sale-${sale.id}`,
        title: sale.number || "Savdo",
        type: "Savdo",
        description: [sale.customerName, sale.status, `${formatFinanceMoney(sale.total)} so'm`]
          .filter(Boolean)
          .join(" / "),
        path: `/sales/history/${sale.id}`,
      });
    }
  });

  getStoredPurchases().forEach((purchase) => {
    if (matchesQuery(normalizedQuery, purchase.number, purchase.supplierName, purchase.status)) {
      results.push({
        id: `purchase-${purchase.id}`,
        title: purchase.number || "Xarid",
        type: "Xarid",
        description: [purchase.supplierName, purchase.status, `${formatFinanceMoney(purchase.total)} so'm`]
          .filter(Boolean)
          .join(" / "),
        path: `/purchases/${purchase.id}`,
      });
    }
  });

  getStoredSuppliers().forEach((supplier) => {
    if (matchesQuery(normalizedQuery, supplier.name, supplier.phone, supplier.companyName, supplier.email)) {
      results.push({
        id: `supplier-${supplier.id}`,
        title: supplier.name || supplier.companyName || "Yetkazib beruvchi",
        type: "Yetkazib beruvchi",
        description: [supplier.phone, supplier.status].filter(Boolean).join(" / "),
        path: `/suppliers/${supplier.id}`,
      });
    }
  });

  getStoredAgents().forEach((agent) => {
    if (matchesQuery(normalizedQuery, agent.name, agent.phone, agent.region, agent.route)) {
      results.push({
        id: `agent-${agent.id}`,
        title: agent.name || "Agent",
        type: "Agent",
        description: [agent.phone, agent.region, agent.status].filter(Boolean).join(" / "),
        path: `/agents/${agent.id}`,
      });
    }
  });

  getStoredProductionOrders().forEach((order) => {
    if (matchesQuery(normalizedQuery, order.number, order.productName, order.status)) {
      results.push({
        id: `production-${order.id}`,
        title: order.number || "Ishlab chiqarish",
        type: "Ishlab chiqarish",
        description: [order.productName, order.status].filter(Boolean).join(" / "),
        path: `/manufacturing/orders/${order.id}`,
      });
    }
  });

  return results.slice(0, SEARCH_LIMIT);
};

const getNotificationItems = (notifications) => {
  const items = [];

  if (notifications.lowStockWarning || notifications.outOfStockWarning) {
    getStoredProducts().forEach((product) => {
      const status = getStockStatus(product);

      if (status === "OUT_OF_STOCK" && notifications.outOfStockWarning) {
        items.push({
          id: `out-${product.id}`,
          title: "Mahsulot tugagan",
          description: product.name || product.sku || "Mahsulot",
          path: `/products/${product.id}`,
          tone: "danger",
        });
      }

      if (status === "LOW_STOCK" && notifications.lowStockWarning) {
        items.push({
          id: `low-${product.id}`,
          title: "Qoldiq kamaygan",
          description: `${product.name || product.sku || "Mahsulot"} / ${product.stock || 0} ${product.unit || ""}`,
          path: `/products/${product.id}`,
          tone: "warning",
        });
      }
    });
  }

  if (notifications.customerDebtWarning) {
    getCustomerDebts()
      .filter((row) => row.debt > 0)
      .slice(0, 8)
      .forEach((row) => {
        items.push({
          id: `customer-debt-${row.customerId}`,
          title: "Mijoz qarzi",
          description: `${row.customerName} / ${formatFinanceMoney(row.debt)} so'm`,
          path: row.customerId ? `/customers/${row.customerId}` : "/finance/debts",
          tone: "warning",
        });
      });
  }

  if (notifications.supplierDebtWarning) {
    getSupplierDebts()
      .filter((row) => row.debt > 0)
      .slice(0, 8)
      .forEach((row) => {
        items.push({
          id: `supplier-debt-${row.supplierId}`,
          title: "Yetkazib beruvchi qarzi",
          description: `${row.supplierName} / ${formatFinanceMoney(row.debt)} so'm`,
          path: row.supplierId ? `/suppliers/${row.supplierId}` : "/finance/debts",
          tone: "warning",
        });
      });
  }

  if (notifications.latePurchaseWarning) {
    getStoredPurchases()
      .filter((purchase) =>
        !["RECEIVED", "CANCELLED"].includes(purchase.status) && isPastDate(purchase.expectedDate),
      )
      .slice(0, 8)
      .forEach((purchase) => {
        items.push({
          id: `late-purchase-${purchase.id}`,
          title: "Xarid kechikkan",
          description: [purchase.number, purchase.supplierName, purchase.expectedDate].filter(Boolean).join(" / "),
          path: `/purchases/${purchase.id}`,
          tone: "warning",
        });
      });
  }

  if (notifications.productionShortageWarning) {
    getStoredProductionOrders()
      .filter((order) => ["PLANNED", "IN_PROGRESS"].includes(order.status))
      .forEach((order) => {
        const availability = checkMaterialAvailability({
          warehouseId: order.warehouseId,
          requiredMaterials: order.requiredMaterials || [],
        });

        if (!hasEnoughMaterials(availability)) {
          items.push({
            id: `shortage-${order.id}`,
            title: "Xomashyo yetishmaydi",
            description: [order.number, order.productName].filter(Boolean).join(" / "),
            path: `/manufacturing/orders/${order.id}`,
            tone: "danger",
          });
        }
      });
  }

  if (notifications.overdueCrmFollowUp) {
    const customers = new Map(getStoredCustomers().map((customer) => [customer.id, customer]));

    getStoredCustomerFollowUps()
      .filter((followUp) => followUp.status === "OPEN" && isPastDate(followUp.date))
      .slice(0, 8)
      .forEach((followUp) => {
        const customer = customers.get(followUp.customerId);

        items.push({
          id: `follow-${followUp.id}`,
          title: "Mijoz aloqasi kechikkan",
          description: [getCustomerDisplayName(customer), followUp.date].filter(Boolean).join(" / "),
          path: followUp.customerId ? `/customers/${followUp.customerId}` : "/customers",
          tone: "warning",
        });
      });
  }

  if (notifications.payrollDebtWarning || notifications.lateEmployeeWarning) {
    const hrSummary = getHrSummary();

    if (notifications.payrollDebtWarning && hrSummary.salaryDebt > 0) {
      items.push({
        id: "payroll-debt",
        title: "Oylik qarzi mavjud",
        description: `${formatFinanceMoney(hrSummary.salaryDebt)} so'm`,
        path: "/hr/payroll",
        tone: "warning",
      });
    }

    if (notifications.lateEmployeeWarning && hrSummary.lateCount > 0) {
      items.push({
        id: "late-employees",
        title: "Kechikkan xodimlar",
        description: `${hrSummary.lateCount} ta yozuv`,
        path: "/hr/attendance",
        tone: "warning",
      });
    }
  }

  return items;
};

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const searchInputRef = useRef(null);
  const user = useCurrentUser();
  const { company } = useCompany();
  const appearance = useAppearanceSettings();
  const formats = useFormatSettings();
  const notifications = useNotificationSettings();
  const [openMenu, setOpenMenu] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [refreshKey, setRefreshKey] = useState(0);
  const [notificationItems, setNotificationItems] = useState([]);

  const userName = user?.fullName || user?.name || "Foydalanuvchi";
  const companyName = company?.businessName || company?.name || "Kompaniya";
  const userInitial = userName.trim()?.charAt(0)?.toUpperCase() || "U";
  const activeLanguage =
    LANGUAGE_OPTIONS.find((item) => item.value === normalizeLanguage(formats.language)) ||
    LANGUAGE_OPTIONS[0];
  const isDarkMode =
    appearance.theme === "dark" ||
    (appearance.theme === "system" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  const notificationCount = notificationItems.length;

  const searchResults = useMemo(
    () => getSearchResults(debouncedSearch),
    [debouncedSearch, refreshKey],
  );

  const showSearchPanel = searchQuery.trim().length >= 2;

  useEffect(() => {
    let disposed = false;
    let timeoutId = null;
    let idleId = null;

    const loadNotifications = () => {
      if (!disposed) {
        setNotificationItems(getNotificationItems(notifications));
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(loadNotifications, { timeout: 800 });
    } else {
      timeoutId = window.setTimeout(loadNotifications, 0);
    }

    return () => {
      disposed = true;

      if (idleId !== null) {
        window.cancelIdleCallback?.(idleId);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [notifications, refreshKey]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!headerRef.current?.contains(event.target)) {
        setOpenMenu("");
        setSearchQuery("");
        setDebouncedSearch("");
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenMenu("");
        setSearchQuery("");
        setDebouncedSearch("");
        searchInputRef.current?.blur();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        navigate("/sales/terminal");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const refresh = () => setRefreshKey((current) => current + 1);
    const events = [
      "storage",
      "products:changed",
      "customers:changed",
      "sales:changed",
      "warehouse:changed",
      "finance:changed",
      "purchases:changed",
      "suppliers:changed",
      "agents:changed",
      "manufacturing:changed",
      "hr:changed",
    ];

    events.forEach((eventName) => window.addEventListener(eventName, refresh));

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, refresh));
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleLogout = () => {
    setOpenMenu("");
    authService.logout();
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const navigateTo = (path) => {
    setOpenMenu("");
    setSearchQuery("");
    setDebouncedSearch("");
    navigate(path);
  };

  const toggleMenu = (menu) => {
    setOpenMenu((current) => (current === menu ? "" : menu));
  };

  const changeLanguage = (language) => {
    dispatch(updateFormats({ language: normalizeLanguage(language) }));
    setOpenMenu("");
  };

  const toggleTheme = () => {
    dispatch(updateAppearance({ theme: isDarkMode ? "light" : "dark" }));
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenEnabled) {
        return;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  };

  return (
    <header ref={headerRef} className="header">
      <div className="header__search-wrap">
        <label className="header__search" aria-label="Global qidirish">
          <Search className="header__search-icon" size={18} strokeWidth={1.8} />

          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            placeholder="Qidirish..."
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setOpenMenu("")}
          />
        </label>

        {showSearchPanel && (
          <div className="header__search-panel" role="listbox" aria-label="Qidirish natijalari">
            {searchResults.length ? (
              searchResults.map((result) => (
                <button
                  key={result.id}
                  className="header__search-result"
                  type="button"
                  onClick={() => navigateTo(result.path)}
                >
                  <span>
                    <strong>{result.title}</strong>
                    <small>{result.description || "Ma'lumot mavjud"}</small>
                  </span>
                  <b>{result.type}</b>
                </button>
              ))
            ) : (
              <div className="header__empty">Natija topilmadi.</div>
            )}
          </div>
        )}
      </div>

      <div className="header__actions">
        <div className="header__action-wrap">
          <button
            className="header__icon-button"
            type="button"
            aria-label="Tez qo'shish"
            title="Tez qo'shish"
            aria-haspopup="menu"
            aria-expanded={openMenu === "quick-add"}
            onClick={() => toggleMenu("quick-add")}
          >
            <Plus size={19} strokeWidth={1.9} />
          </button>

          {openMenu === "quick-add" && (
            <div className="header__dropdown header__dropdown--compact" role="menu">
              {QUICK_ADD_ITEMS.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.path}
                    className="header__dropdown-item"
                    type="button"
                    role="menuitem"
                    onClick={() => navigateTo(item.path)}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                  <span>{translateText(item.label)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="header__action-wrap header__action-wrap--desktop">
          <button
            className="header__icon-button header__icon-button--language"
            type="button"
            aria-label="Tilni tanlash"
            title="Til"
            aria-haspopup="menu"
            aria-expanded={openMenu === "language"}
            onClick={() => toggleMenu("language")}
          >
            <Globe2 size={18} strokeWidth={1.8} />
            <span>{activeLanguage.label}</span>
          </button>

          {openMenu === "language" && (
            <div className="header__dropdown header__dropdown--mini" role="menu">
              {LANGUAGE_OPTIONS.map((language) => (
                <button
                  key={language.value}
                  className={[
                    "header__dropdown-item",
                    language.value === activeLanguage.value ? "header__dropdown-item--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  role="menuitemradio"
                  aria-checked={language.value === activeLanguage.value}
                  onClick={() => changeLanguage(language.value)}
                >
                  <span>{language.title}</span>
                  <b>{language.label}</b>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="header__icon-button header__action-wrap--desktop"
          type="button"
          aria-label={isDarkMode ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
          title={isDarkMode ? "Yorug' rejim" : "Qorong'i rejim"}
          onClick={toggleTheme}
        >
          {isDarkMode ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
        </button>

        <button
          className="header__icon-button header__action-wrap--desktop"
          type="button"
          aria-label={isFullscreen ? "To'liq ekrandan chiqish" : "To'liq ekran"}
          title={isFullscreen ? "To'liq ekrandan chiqish" : "To'liq ekran"}
          disabled={!document.fullscreenEnabled}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 size={18} strokeWidth={1.8} />
          ) : (
            <Maximize2 size={18} strokeWidth={1.8} />
          )}
        </button>

        <div className="header__action-wrap header__action-wrap--desktop">
          <button
            className="header__icon-button"
            type="button"
            aria-label="Yordam va klaviatura"
            title="Yordam"
            aria-haspopup="menu"
            aria-expanded={openMenu === "help"}
            onClick={() => toggleMenu("help")}
          >
            <Keyboard size={18} strokeWidth={1.8} />
          </button>

          {openMenu === "help" && (
            <div className="header__dropdown header__dropdown--help" role="menu">
              <div className="header__shortcut">
                <span>Global qidirish</span>
                <kbd>Ctrl</kbd>
                <kbd>K</kbd>
              </div>
              <div className="header__shortcut">
                <span>Yangi savdo</span>
                <kbd>Alt</kbd>
                <kbd>S</kbd>
              </div>
              <div className="header__shortcut">
                <span>Yopish</span>
                <kbd>Esc</kbd>
              </div>
              <div className="header__shortcut">
                <span>Shtrix-kod kiritish</span>
                <kbd>Enter</kbd>
              </div>
            </div>
          )}
        </div>

        <div className="header__action-wrap header__action-wrap--mobile">
          <button
            className="header__icon-button"
            type="button"
            aria-label="Ko'proq amallar"
            title="Ko'proq"
            aria-haspopup="menu"
            aria-expanded={openMenu === "more"}
            onClick={() => toggleMenu("more")}
          >
            <MoreHorizontal size={19} strokeWidth={1.9} />
          </button>

          {openMenu === "more" && (
            <div className="header__dropdown header__dropdown--compact" role="menu">
              <div className="header__language-row" aria-label="Tilni tanlash">
                {LANGUAGE_OPTIONS.map((language) => (
                  <button
                    key={language.value}
                    className={language.value === activeLanguage.value ? "active" : ""}
                    type="button"
                    onClick={() => changeLanguage(language.value)}
                  >
                    {language.label}
                  </button>
                ))}
              </div>
              <button className="header__dropdown-item" type="button" onClick={toggleTheme}>
                {isDarkMode ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
                <span>{isDarkMode ? "Yorug' rejim" : "Qorong'i rejim"}</span>
              </button>
              {document.fullscreenEnabled && (
                <button className="header__dropdown-item" type="button" onClick={toggleFullscreen}>
                  {isFullscreen ? (
                    <Minimize2 size={16} strokeWidth={1.8} />
                  ) : (
                    <Maximize2 size={16} strokeWidth={1.8} />
                  )}
                  <span>{isFullscreen ? "Ekrandan chiqish" : "To'liq ekran"}</span>
                </button>
              )}
              <div className="header__dropdown-title header__dropdown-title--plain">
                <strong>Klaviatura</strong>
              </div>
              <div className="header__shortcut">
                <span>Global qidirish</span>
                <kbd>Ctrl</kbd>
                <kbd>K</kbd>
              </div>
              <div className="header__shortcut">
                <span>Yangi savdo</span>
                <kbd>Alt</kbd>
                <kbd>S</kbd>
              </div>
              <div className="header__shortcut">
                <span>Yopish</span>
                <kbd>Esc</kbd>
              </div>
            </div>
          )}
        </div>

        <div className="header__action-wrap">
          <button
            className={[
              "header__icon-button",
              notificationCount > 0 ? "header__icon-button--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            type="button"
            aria-label={`Bildirishnomalar${notificationCount ? `: ${notificationCount}` : ""}`}
            title="Bildirishnomalar"
            aria-haspopup="menu"
            aria-expanded={openMenu === "notifications"}
            onClick={() => toggleMenu("notifications")}
          >
            {notificationCount > 0 ? (
              <LiveIcon icon={Bell} motion="pulse-soft" once size={19} strokeWidth={1.8} />
            ) : (
              <Bell size={19} strokeWidth={1.8} />
            )}

            {notificationCount > 0 && (
              <span className="header__notification-badge">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>

          {openMenu === "notifications" && (
            <div className="header__dropdown header__dropdown--notifications" role="menu">
              <div className="header__dropdown-title">
                <strong>Bildirishnomalar</strong>
                <span>{notificationCount ? `${notificationCount} ta signal` : "Yangi signal yo'q"}</span>
              </div>

              {notificationItems.length ? (
                notificationItems.slice(0, 10).map((item) => (
                  <button
                    key={item.id}
                    className={`header__notification-item header__notification-item--${item.tone}`}
                    type="button"
                    role="menuitem"
                    onClick={() => navigateTo(item.path)}
                  >
                    <i />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </span>
                  </button>
                ))
              ) : (
                <div className="header__empty">Faol bildirishnoma yo'q.</div>
              )}
            </div>
          )}
        </div>

        <div className="header__profile-wrap">
          <button
            className={[
              "header__profile",
              openMenu === "profile" ? "header__profile--open" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            type="button"
            aria-haspopup="menu"
            aria-expanded={openMenu === "profile"}
            onClick={() => toggleMenu("profile")}
          >
            <span className="header__avatar">
              {user?.avatar ? <img src={user.avatar} alt="" /> : userInitial}
            </span>

            <span className="header__profile-info">
              <strong>{userName}</strong>
              <small>{companyName}</small>
            </span>

            <ChevronDown className="header__chevron" size={16} strokeWidth={1.8} />
          </button>

          {openMenu === "profile" && (
            <div className="header__dropdown" role="menu">
              <div className="header__dropdown-profile">
                <span className="header__avatar header__avatar--lg">
                  {user?.avatar ? <img src={user.avatar} alt="" /> : userInitial}
                </span>
                <div>
                  <span>Profil</span>
                  <strong>{userName}</strong>
                  <small>{companyName}</small>
                </div>
              </div>

              <Link
                className="header__dropdown-item"
                to="/profile"
                role="menuitem"
                onClick={() => setOpenMenu("")}
              >
                <Users size={16} strokeWidth={1.8} />
                <span>Profil</span>
              </Link>

              <Link
                className="header__dropdown-item"
                to="/profile/settings"
                role="menuitem"
                onClick={() => setOpenMenu("")}
              >
                <Settings size={16} strokeWidth={1.8} />
                <span>Sozlamalar</span>
              </Link>

              <button
                className="header__dropdown-item"
                type="button"
                role="menuitem"
                onClick={handleLogout}
              >
                <LogOut size={16} strokeWidth={1.8} />
                <span>Chiqish</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
