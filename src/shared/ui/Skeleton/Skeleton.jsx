import "./Skeleton.scss";

const Skeleton = ({
  width = "100%",
  height = 16,
  radius = 10,
  className = "",
}) => {
  return (
    <div
      className={["ui-skeleton", className].filter(Boolean).join(" ")}
      style={{
        width,
        height,
        borderRadius: radius,
      }}
    />
  );
};

export default Skeleton;
