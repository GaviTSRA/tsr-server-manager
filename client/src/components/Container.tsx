import { LegacyRef, useMemo, useState } from "react";

type InputProps =
  | {
      className?: string;
      expanded?: boolean;
      onClick?: () => void;
      innerRef?: LegacyRef<HTMLDivElement>;
    } & (
      | {
          title?: JSX.Element | JSX.Element[];
          children: JSX.Element | JSX.Element[];
        }
      | {
          tabs: {
            title: JSX.Element;
            content: JSX.Element | JSX.Element[];
          }[];
        }
    );

export function Container({
  className,
  onClick,
  expanded,
  innerRef,
  ...props
}: InputProps) {
  const [tab, setTab] = useState(0);
  const tabContent = useMemo(
    () => "tabs" in props && props.tabs[tab].content,
    [props, tab]
  );

  if ("children" in props) {
    const { children, title } = props;
    return (
      <div
        onClick={onClick}
        className={`${expanded ? "h-full" : "h-fit"} shadow-xl`}
      >
        {title && (
          <div className="border-neutral-400 border-x border-t rounded-t-lg">
            <div className="w-full flex flex-row items-center gap-2 px-4 py-2 bg-neutral-200 rounded-t-lg border-b-2 border-neutral-150">
              {title}
            </div>
          </div>
        )}
        <div
          className={`bg-neutral-200 border-neutral-400 border-x border-b rounded-b-lg p-2 ${
            title ? "" : "rounded-t-lg border-t"
          } ${className ?? ""}`}
          ref={innerRef}
        >
          {children}
        </div>
      </div>
    );
  } else {
    return (
      <div
        onClick={onClick}
        className={`${expanded ? "h-full" : "h-fit"} shadow-xl`}
      >
        <div className="border-neutral-400 bg-neutral-200 border-b-2 border-b-neutral-150 border-x border-t rounded-t-lg flex flex-row gap-4 items-center">
          {props.tabs.map((tabData, index) => (
            <div
              key={index}
              className={`w-fit flex flex-row items-center gap-2 px-4 py-2 cursor-pointer ${
                index === tab ? "bg-neutral-300" : ""
              }`}
              onClick={() => setTab(index)}
            >
              {tabData.title}
            </div>
          ))}
        </div>
        <div
          className={`bg-neutral-200 border-neutral-400 border-x border-b rounded-b-lg p-2 ${
            className ?? ""
          }`}
          ref={innerRef}
        >
          {tabContent}
        </div>
      </div>
    );
  }
}
