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
      className={expanded ? "h-full shadow-xl" : "shadow-xl"}
    >
      {title && (
        <div className="w-full flex flex-row items-center gap-2 px-4 py-2 bg-neutral-200 rounded-t-lg border-b-2 border-neutral-150">
          {title}
        </div>
      )}
      <div
        className={
          "bg-neutral-200 rounded-b-lg p-2 " +
          (title ? "" : "rounded-t-lg ") +
          (className ?? "")
        }
        ref={innerRef}
      >
        {children}
      </div>
    </div>
  );
}
