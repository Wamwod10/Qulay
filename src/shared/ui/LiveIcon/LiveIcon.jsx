import "./LiveIcon.scss";

const MOTION_MAP = {
  "spin-slow": "spin-slow",
  spin: "spin-slow",
  "pulse-soft": "pulse-soft",
  pulse: "pulse-soft",
  "warning-glow": "warning-glow",
  warning: "warning-glow",
  "danger-breathe": "danger-breathe",
  danger: "danger-breathe",
  "success-pop": "success-pop",
  success: "success-pop",
  "slide-x-soft": "slide-x-soft",
  slide: "slide-x-soft",
  "trend-up-soft": "trend-up-soft",
  "trend-down-soft": "trend-down-soft",
  "stock-in-soft": "stock-in-soft",
  "stock-out-soft": "stock-out-soft",
};

const LiveIcon = ({
  icon: Icon,
  children,
  motion,
  active = true,
  once = false,
  size = 18,
  strokeWidth,
  className = "",
  "aria-label": ariaLabel,
  ...props
}) => {
  const normalizedMotion = MOTION_MAP[motion] || motion;
  const shouldAnimate = Boolean(active && normalizedMotion);
  const iconNode =
    children ||
    (Icon ? <Icon size={size} strokeWidth={strokeWidth} {...props} /> : null);

  if (!iconNode) {
    return null;
  }

  return (
    <span
      className={[
        "ui-live-icon",
        shouldAnimate ? `ui-live-icon--${normalizedMotion}` : "",
        shouldAnimate && once ? "ui-live-icon--once" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {iconNode}
    </span>
  );
};

export default LiveIcon;
