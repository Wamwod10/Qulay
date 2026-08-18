import { Boxes } from "lucide-react";

import { EmptyState } from "../../../../shared/ui";
import { translateText } from "../../../../localization/i18n";

import StockCard from "../StockCard/StockCard";

import "./StockGrid.scss";

const StockGrid = ({ items = [], onView }) => {
  if (!items.length) {
    return (
      <EmptyState
        icon={Boxes}
        title={translateText("Omborda mahsulot topilmadi")}
        description={translateText(
          "Tanlangan ombor yoki filterlar bo‘yicha mahsulot mavjud emas.",
        )}
      />
    );
  }

  return (
    <div className="warehouse-stock-grid">
      {items.map((item) => (
        <StockCard key={item.id} item={item} onView={onView} />
      ))}
    </div>
  );
};

export default StockGrid;
