import { useSelector } from "react-redux";

const useWarehouse = () => {
  const warehouse = useSelector(
    (state) => state.tenant.warehouse,
  );

  const warehouses = useSelector(
    (state) => state.tenant.warehouses,
  );

  return {
    warehouse,
    warehouses,
  };
};

export default useWarehouse;