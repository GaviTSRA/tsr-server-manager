type InputProps = {
  className?: string;
  children: JSX.Element | JSX.Element[];
  title?: JSX.Element | JSX.Element[];
  expanded?: boolean;
  onClick?: () => void;
};

export function Container({ title, className, children, onClick, expanded }: InputProps) {
  return (
    <div onClick={onClick} className={expanded ? "h-full" : ""}>
      {title && (
        <div className="w-full flex flex-row items-center gap-2 px-4 py-2 bg-dark rounded-t-xl">
          {title}
        </div>
      )}
      <div className={
        "bg-neutral-200 rounded-b-xl p-2 " + (!title && " rounded-t-xl ") +
        className
      }>
        {children}
      </div>
    </div >
  );
}
