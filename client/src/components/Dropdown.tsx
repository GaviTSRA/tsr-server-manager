import { useState } from "react";
import { ChevronDown, ChevronUp } from "react-feather";

type DropdownProps = {
  values: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  color?: string;
  defaultValue?: string;
  render?: (option: string) => JSX.Element;
};

export function Dropdown({
  values,
  onSelect,
  placeholder,
  defaultValue,
  render = (option: string) => <p>{option}</p>,
  color = "bg-neutral-300 hover:bg-neutral-400 border-neutral-500",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue);

  return (
    <div onClick={() => setOpen(!open)} className="relative cursor-pointer">
      <div
        className={
          `flex flex-row items-center select-none p-2 border-1 ${color} ` +
          (open ? "rounded-t-sm " : "rounded-sm ") +
          (selected ? "" : "text-secondary-text")
        }
      >
        {selected && render(selected)}
        <p>{!selected && (placeholder ?? "Select an option...")}</p>
        <div className="ml-auto text-secondary-text">
          {open && <ChevronUp />}
          {!open && <ChevronDown />}
        </div>
      </div>
      {open && (
        <div className="absolute w-full shadow-lg border-x-1 border-b-1 border-neutral-500 rounded-b">
          <div
            className="fixed top-0 left-0 w-full h-full z-50"
            onClick={() => setOpen(false)}
          ></div>
          {values.map((value, index) => (
            <div
              className={`relative w-full z-60 cursor-pointer ${color} p-2 last:rounded-b`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                setSelected(value);
                onSelect(value);
              }}
              key={index}
            >
              {render(value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
