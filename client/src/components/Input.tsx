type InputProps = {
  onValueChange: (value: string) => void;
  onKeyDown?: (event) => void;
  placeholder?: string;
  className?: string;
  value?: string;
  type?: string;
};

export function Input({
  onValueChange,
  onKeyDown,
  placeholder,
  className,
  value,
  type = "text",
}: InputProps) {
  return (
    <input
      className={
        "p-2 w-full bg-neutral-300 border-b-2 border-neutral-400 focus:border-primary-100 transition-colors duration-300 outline-none " +
        className
      }
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={placeholder}
      value={value}
      onKeyDown={onKeyDown}
      type={type}
    />
  );
}
