import { LegacyRef } from "react";

type InputProps = {
  className?: string;
  children: JSX.Element | JSX.Element[];
  title?: JSX.Element | JSX.Element[];
  expanded?: boolean;
  onClick?: () => void;
  innerRef?: LegacyRef<HTMLDivElement>;
};

export function Container({
  title,
  className,
  children,
  onClick,
  expanded,
  innerRef,
}: InputProps) {
  return (
    <div onClick={onClick} className={expanded ? "h-full" : ""}>
      {title && (
        <div className="w-full flex flex-row items-center gap-2 px-4 py-2 bg-dark-100 rounded-t-xl">
          {title}
        </div>
      )}
      <div
        className={
          "bg-neutral-200 rounded-b-xl p-2 " +
          (title ? "" : "rounded-t-xl ") +
          className
        }
        ref={innerRef}
      >
        {children}
      </div>
    </div>
  );
}
