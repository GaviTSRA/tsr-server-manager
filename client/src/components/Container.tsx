type InputProps = {
  className?: string;
  children: JSX.Element | JSX.Element[];
  onClick?: () => void;
};

export function Container({ className, children, onClick }: InputProps) {
  return (
    <div
      className={
        "p-2 shadow-[0_5px_10px_3px_rgba(0,0,0,0.3)] bg-neutral-200 rounded " +
        className
      }
      onClick={onClick}
    >
      {children}
    </div>
  );
}
