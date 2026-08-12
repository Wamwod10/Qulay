import "./Tabs.scss";

const Tabs = ({ items = [], activeKey, onChange }) => {
  return (
    <div className="ui-tabs">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={[
            "ui-tabs__item",
            activeKey === item.key ? "ui-tabs__item--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onChange?.(item.key)}
        >
          {item.icon && <span className="ui-tabs__icon">{item.icon}</span>}

          <span>{item.label}</span>

          {item.count !== undefined && (
            <span className="ui-tabs__count">{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
