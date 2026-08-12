import "./Badge.scss";

const Badge = ({
  children,
  variant = "neutral",
  size = "md",
  className = "",
}) => {
  const classes = [
    "ui-badge",
    `ui-badge--${variant}`,
    `ui-badge--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
};

export default Badge;
