type InputProps = {
  className?: string;
  children: JSX.Element[];
};

export function Container({ className, children }: InputProps) {
  return (
    <div
      className={
        "p-2 shadow-[0_5px_10px_3px_rgba(0,0,0,0.3)] bg-neutral-200 rounded " +
        className
      }
    >
      {children}
    </div>
  );
}
