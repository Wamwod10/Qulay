import "./Button.scss";

const Button = ({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  className = "",
  ...props
}) => {
  const classes = [
    "ui-button",
    `ui-button--${variant}`,
    `ui-button--${size}`,
    fullWidth ? "ui-button--full" : "",
    loading ? "ui-button--loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="ui-button__loader" />
      ) : (
        <>
          {leftIcon && <span className="ui-button__icon">{leftIcon}</span>}

          <span>{children}</span>

          {rightIcon && <span className="ui-button__icon">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

export default Button;
