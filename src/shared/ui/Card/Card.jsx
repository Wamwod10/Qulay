import "./Card.scss";

const Card = ({
  children,
  variant = "raised",
  padding = "md",
  className = "",
  ...props
}) => {
  const classes = [
    "ui-card",
    `ui-card--${variant}`,
    `ui-card--padding-${padding}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;
