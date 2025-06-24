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
    <div
      onClick={onClick}
      className={`${expanded ? "h-full" : "h-fit"} shadow-xl`}
    >
      {title && (
        <div className="border-neutral-400 border-x-1 border-t-1 rounded-t-lg">
          <div className="w-full flex flex-row items-center gap-2 px-4 py-2 bg-neutral-200 rounded-t-lg border-b-2 border-neutral-150">
            {title}
          </div>
        </div>
      )}
      <div
        className={`bg-neutral-200 border-neutral-400 border-x-1 border-b-1 rounded-b-lg p-2 ${
          title ? "" : "rounded-t-lg border-t-1"
        } ${className ?? ""}`}
        ref={innerRef}
      >
        {children}
      </div>
    </div>
  );
}
