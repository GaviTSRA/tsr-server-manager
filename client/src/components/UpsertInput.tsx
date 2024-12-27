import { Input } from "./Input";
import { Error, ErrorType } from "./Error";
import { MoonLoader } from "react-spinners";
import { useEffect, useState } from "react";
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
    const [edited, setEdited] = useState(false);
    const [internalError, setInternalError] = useState(undefined as ErrorType | undefined | null);
    const [internalFetching, setInternalFetching] = useState(false);
    const [internalSuccess, setInternalSuccess] = useState(false);

    useEffect(() => {
        if (edited && !internalFetching) {
            setInternalFetching(fetching);
            if (fetching) {
                setInternalError(null);
                setInternalSuccess(false);
            }
        }
    }, [fetching])
    useEffect(() => {
        if (edited && error) {
            setInternalError(error);
            setInternalFetching(false);
            setEdited(false);
        }
    }, [error])
    useEffect(() => {
        if (edited && success) {
            setInternalSuccess(success);
            setInternalFetching(false);
            setEdited(false);
        }
    }, [success])

    return (
        <div>
            <div className="flex flex-col">
                <div className="flex flex-col mb-2">
                    <div className="flex flex-row items-center">
                        <p className="text-xl text-white mr-auto">{label}</p>
                        {internalFetching && <MoonLoader size={20} color="white" />}
                        {internalError && <Error error={internalError} size="small" />}
                        {internalSuccess && <Check size={20} color={"green"} strokeWidth={4} />}
                    </div>
                    <p className="text-secondary-text">{description}</p>
                </div>
                <Input
                    value={value}
                    type={type}
                    onValueChange={(newValue) => {
                        setValue(newValue);
                        setEdited(true);
                    }}
                    onBlur={() => {
                        setEdited(true);
                        mutate(currentValue);
                    }}
                    className="rounded"
                />
            </div>
        </div>
    )
}