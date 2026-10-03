import "./ToolbarButton.css";

export default function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  className = "",
}) {
  return (
    <button
      type="button"
      className={`toolbar-button ${className}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={26} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
