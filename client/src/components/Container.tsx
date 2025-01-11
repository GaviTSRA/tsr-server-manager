type InputProps = {
  className?: string;
  children: JSX.Element | JSX.Element[];
  title?: JSX.Element | JSX.Element[];
  onClick?: () => void;
};

export function Container({ title, className, children, onClick }: InputProps) {
  return (
    <div onClick={onClick}>
      {title && (
        <div className="w-full flex flex-row items-center gap-2 px-4 py-2 bg-dark rounded-t-xl">
          {title}
        </div>
      )}
      <div className={
        "bg-neutral-200 rounded-b-xl p-2 " +
        className
      }>
        {children}
      </div>
    </div>
  );
}
