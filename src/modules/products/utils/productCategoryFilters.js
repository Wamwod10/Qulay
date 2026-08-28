export const UNCATEGORIZED_CATEGORY_FILTER = "__uncategorized__";

export const isUncategorizedProduct = (product) =>
  !String(product?.categoryId || "").trim() &&
  !String(product?.category || "").trim();

const normalizeCategoryName = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[‘’ʻʼ`]/g, "'");

export const matchesProductCategory = (
  product,
  categoryFilter,
  categoryName = "",
) => {
  if (!categoryFilter) return true;

  if (categoryFilter === UNCATEGORIZED_CATEGORY_FILTER) {
    return isUncategorizedProduct(product);
  }

  const productCategoryName = normalizeCategoryName(product?.category);
  const selectedCategoryName = normalizeCategoryName(categoryName);

  return (
    product?.categoryId === categoryFilter ||
    product?.category === categoryFilter ||
    (Boolean(selectedCategoryName) && productCategoryName === selectedCategoryName)
  );
};
