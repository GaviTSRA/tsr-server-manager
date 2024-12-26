import { TRPCClientErrorBase } from "@trpc/react-query";
import { DefaultErrorShape } from "@trpc/server/unstable-core-do-not-import";
import { AlertTriangle, Frown, HelpCircle, Lock } from "react-feather"

export type ErrorType = TRPCClientErrorBase<DefaultErrorShape>;
export function Error({ error, size }: { error: ErrorType, size?: "small" }): JSX.Element {
    if (!error.data) {
        return (
            <div className="w-full h-full flex flex-col gap-2 items-center justify-center">
                <Frown />
                <p className="text-2xl text-white">Network Error</p>
            </div>
        )
    }
    let small = size === "small";
    let finalSize = small ? 20 : 60;

    let message = `Unkown Error (${error.data.code})`;
    let icon = <Frown size={finalSize} className="text-danger" />;
    let details = `${error.message}`;

    switch (error.data.httpStatus) {
        case 401:
            message = "Access Denied";
            icon = <Lock size={finalSize} className="text-danger" />;
            break;
        case 404:
            message = "Not Found";
            icon = <HelpCircle size={finalSize} className="text-danger" />;
            break;
        case 500:
            message = "Internal Server Error";
            icon = <AlertTriangle size={finalSize} className="text-danger" />;
            break;
    }

    if (small) {
        return (
            <div className="flex flex-row gap-1 items-center">
                {icon}
                <p className="text-secondary">{details}</p>
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col gap-2 items-center justify-center">
            <div className="flex flex-col">
                {icon}
                <p className="text-2xl text-white">{message}</p>
            </div>
            <p className="text-large text-center text-secondary">{details}</p>
        </div >
    )
}