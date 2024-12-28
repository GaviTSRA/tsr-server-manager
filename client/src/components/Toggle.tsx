import { useState } from "react";

export function Toggle({
  defaultValue = false,
  disabled = false,
  onChange
}: {
  defaultValue?: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  const [checked, setChecked] = useState(defaultValue);
  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        if (disabled) return;
        onChange(!checked);
        setChecked(!checked);
      }}
      className={
        "w-12 h-6 flex items-center rounded-full p-1 cursor-pointer " +
        `${checked ? "bg-success" : "bg-danger"}`
      }
    >
      <div
        className={
          "w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out " +
          `${checked ? "translate-x-6 " : "translate-x-0 "}` +
          `${disabled ? "bg-neutral-300" : "bg-neutral-200"}`
        }
      />
    </div >
  )
}