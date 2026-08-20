import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import {
  apiRequest,
  getCachedApiResponse,
  primeApiCache,
  unwrapList,
} from "../../../services/api/apiClient";

const STORAGE_KEY = "categories";

export const getStoredCategories = () => {
  const remote = unwrapList(
    getCachedApiResponse("/categories"),
    ["categories"],
  );

  if (Array.isArray(remote)) {
    tenantSet(STORAGE_KEY, remote);
    return remote;
  }

  return tenantGet(STORAGE_KEY, []);
};

export const createCategory = async (name, options = {}) => {
  const remote = await apiRequest("/categories", {
    method: "POST",
    body: { name },
    inlineModule: options.inlineModule,
  });

  const category = remote?.id
    ? remote
    : {
      id: `cat-${Date.now()}`,
      name,
      status: "ACTIVE",
    };

  const categories = getStoredCategories().filter(
    (item) => item.id !== category.id,
  );

  const next = [category, ...categories];

  tenantSet(STORAGE_KEY, next);

  primeApiCache("/categories", {
    categories: next,
    data: next,
  });

  return category;
};