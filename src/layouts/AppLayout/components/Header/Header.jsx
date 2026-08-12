import { Bell, ChevronDown, Search } from "lucide-react";

import useCompany from "../../../../hooks/useCompany";
import useCurrentUser from "../../../../hooks/useCurrentUser";

import "./Header.scss";

const Header = () => {
  const user = useCurrentUser();
  const { company } = useCompany();
  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <header className="header">
      <div className="header__search">
        <Search size={18} strokeWidth={1.8} />

        <input type="search" placeholder="Qidirish..." />
      </div>

      <div className="header__actions">
        <button
          className="header__icon-button"
          type="button"
          aria-label="Bildirishnomalar"
        >
          <Bell size={19} strokeWidth={1.8} />
        </button>

        <button className="header__profile" type="button">
          <div className="header__avatar">{userInitial}</div>

          <div className="header__profile-info">
            <strong>{user?.name || "Foydalanuvchi"}</strong>

            <span>{company?.name || "Kompaniya"}</span>
          </div>

          <ChevronDown size={16} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
};

export default Header;
