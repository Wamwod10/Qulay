import { ChevronLeft, ChevronRight } from "lucide-react";

import "./Pagination.scss";

const Pagination = ({ page = 1, totalPages = 1, onChange }) => {
  if (totalPages <= 1) {
    return null;
  }

  const pages = [];

  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    }
  }

  const uniquePages = [...new Set(pages)];

  return (
    <div className="ui-pagination">
      <button
        type="button"
        className="ui-pagination__button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={17} />
      </button>

      {uniquePages.map((item, index) => {
        const previous = uniquePages[index - 1];

        const showDots = previous && item - previous > 1;

        return (
          <div key={item} className="ui-pagination__group">
            {showDots && <span className="ui-pagination__dots">...</span>}

            <button
              type="button"
              className={[
                "ui-pagination__button",
                item === page ? "ui-pagination__button--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          </div>
        );
      })}

      <button
        type="button"
        className="ui-pagination__button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
};

export default Pagination;
