const variants = {
  neutral:
    "border-1 bg-neutral-400 border-neutral-500 hover:bg-neutral-500 active:bg-neutral-600 disabled:bg-neutral-300 text-white disabled:text-secondary-text",
  confirm:
    "border-b-2 bg-neutral-400 border-confirm hover:bg-confirm-hover active:bg-confirm-active disabled:bg-confirm-disabled text-white disabled:text-secondary-text",
  danger:
    "border-b-2 bg-neutral-400 border-cancel hover:bg-cancel-hover active:bg-cancel-active disabled:bg-cancel-disabled text-white disabled:text-secondary-text",
};

export function Button({
  icon,
  text,
  onClick,
  className = "",
  variant = "neutral",
  disabled = false,
}: {
  icon?: JSX.Element;
  text: string | JSX.Element;
  disabled?: boolean;
  onClick?: () => void;
  variant?: "neutral" | "confirm" | "danger";
  className?: string;
}) {
  return (
    <button
      className={`flex flex-row gap-2 rounded px-2 py-1 ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {text}
    </button>
  );
}
