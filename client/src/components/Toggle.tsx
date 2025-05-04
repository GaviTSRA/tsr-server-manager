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
        "w-12 h-6 flex items-center rounded-full p-1 " +
        `${disabled
          ? "bg-neutral-400 cursor-not-allowed"
          : "bg-neutral-400 cursor-pointer"
        }`
      }
    >
      <div
        className={
          "w-4 h-4 transition-all rounded-full shadow-md transform duration-300 ease-in-out " +
          `${checked
            ? `translate-x-6 ${disabled ? "bg-success-disabled" : "bg-success"}`
            : `translate-x-0 ${disabled ? "bg-danger-disabled" : "bg-danger"}`
          }`
        }
      />
    </div >
  )
}