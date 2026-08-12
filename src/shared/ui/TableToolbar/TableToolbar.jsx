import { Search } from "lucide-react";

import Button from "../Button/Button";

import "./TableToolbar.scss";

const TableToolbar = ({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Qidirish...",
  children,
  actionLabel,
  actionIcon,
  onAction,
}) => {
  return (
    <div className="ui-table-toolbar">
      <div className="ui-table-toolbar__search">
        <Search size={17} strokeWidth={1.8} />

        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder={searchPlaceholder}
        />
      </div>

      <div className="ui-table-toolbar__actions">
        {children}

        {actionLabel && (
          <Button leftIcon={actionIcon} onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TableToolbar;
