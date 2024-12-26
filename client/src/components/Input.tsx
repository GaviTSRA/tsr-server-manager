type InputProps = {
  onValueChange?: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  value?: string;
  type?: string;
};

export function Input({
  onValueChange,
  onKeyDown,
  onBlur,
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
      onChange={(event) => onValueChange ? onValueChange(event.target.value) : {}}
      placeholder={placeholder}
      defaultValue={value}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      type={type}
    />
  );
}
