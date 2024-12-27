import { useState } from "react";
import { ChevronDown, ChevronUp } from "react-feather";

type DropdownProps = {
  values: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  color?: string;
  defaultValue?: string;
};

export function Dropdown({
  values,
  onSelect,
  placeholder,
  defaultValue,
  color = "bg-header hover:bg-border",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue);

  return (
    <div onClick={() => setOpen(!open)} className="relative cursor-pointer">
      <div
        className={
          `flex flex-row items-center select-none p-2 ${color} ` +
          (open ? "rounded-t " : "rounded ") +
          (selected ? "" : "text-secondary-text")
        }
      >
        <p>{selected ?? placeholder ?? "Select an option..."}</p>
        <div className="ml-auto mr-2 text-secondary-text">
          {open && <ChevronUp />}
          {!open && <ChevronDown />}
        </div>
      </div>
      {open && (
        <div className="absolute w-full shadow-lg">
          <div
            className="fixed top-0 left-0 w-full h-full z-[50]"
            onClick={() => setOpen(false)}
          ></div>
          {values.map((value, index) => (
            <div
              className={`relative w-full z-[60] cursor-pointer ${color} p-2 last:rounded-b`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                setSelected(value);
                onSelect(value);
              }}
              key={index}
            >
              <p>{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
