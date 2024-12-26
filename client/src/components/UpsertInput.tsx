import { Input } from "./Input";
import { Error, ErrorType } from "./Error";
import { MoonLoader } from "react-spinners";
import { useState } from "react";
import { Check } from "react-feather";

export function UpsertInput(
    { label, description, value, type, mutate, error, fetching, success }: {
        label: string;
        description?: string;
        value: any;
        type: string;
        mutate: (value: string) => void;
        error?: ErrorType | null;
        fetching: boolean;
        success: boolean;
    }): JSX.Element {
    const [currentValue, setValue] = useState(value);
    return (
        <div>
            <div className="flex flex-col">
                <div className="flex flex-col mb-2">
                    <div className="flex flex-row items-center">
                        <p className="text-xl text-white mr-auto">{label}</p>
                        {fetching && <MoonLoader size={20} color="white" />}
                        {error && <Error error={error} size="small" />}
                        {success && <Check size={20} color={"green"} strokeWidth={4} />}
                    </div>
                    <p className="text-secondary-text">{description}</p>
                </div>
                <Input
                    value={value}
                    type={type}
                    onValueChange={(newValue) => setValue(newValue)}
                    onBlur={() => mutate(currentValue)}
                    className="rounded"
                />
            </div>
        </div>
    )
}