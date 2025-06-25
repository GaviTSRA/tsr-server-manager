import { TRPCClientErrorLike } from "@trpc/client";
import { DefaultErrorShape } from "@trpc/server/unstable-core-do-not-import";
import { Check } from "react-feather";
import { MoonLoader } from "react-spinners";
import { Error } from "./Error";

const variants = {
  neutral:
    "border-1 bg-neutral-400 border-neutral-500 hover:bg-neutral-500 active:bg-neutral-600 disabled:bg-neutral-300 text-white disabled:text-secondary-text",
  confirm:
    "border-b-2 bg-neutral-400 border-confirm hover:bg-confirm-hover active:bg-confirm-active disabled:bg-confirm-disabled text-white disabled:text-secondary-text",
  danger:
    "border-b-2 bg-neutral-400 border-cancel hover:bg-cancel-hover active:bg-cancel-active disabled:bg-cancel-disabled text-white disabled:text-secondary-text",
};

export function Button({
  children,
  onClick,
  className = "",
  variant = "neutral",
  disabled = false,
  icon,
  query,
}: {
  children?: JSX.Element | JSX.Element[] | string;
  disabled?: boolean;
  onClick?: () => void;
  variant?: "neutral" | "confirm" | "danger";
  className?: string;
  icon?: JSX.Element;
  query?: {
    isSuccess: boolean;
    isPending: boolean;
    error: TRPCClientErrorLike<{
      input: unknown;
      output: unknown;
      transformer: true;
      errorShape: DefaultErrorShape;
    }> | null;
  };
}) {
  let actualIcon = icon;

  if (query?.isPending) {
    actualIcon = <MoonLoader size={20} color={"#FFFFFF"} />;
  }
  if (query?.isSuccess) {
    actualIcon = <Check size={20} color={"green"} strokeWidth={4} />;
  }

  return (
    <button
      className={`flex flex-row items-center gap-2 rounded px-2 py-1 transition-colors ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {query?.error && <Error error={query.error} />}
      {(!query || !query.error) && (
        <>
          {actualIcon}
          {children}
        </>
      )}
    </button>
  );
}
