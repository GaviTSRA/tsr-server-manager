import { Dropdown } from "./Dropdown";
import { Error, ErrorType } from "./Error";
import { MoonLoader } from "react-spinners";
import { useEffect, useState } from "react";
import { Check } from "react-feather";
import { Container } from "./Container";

export function UpsertDropdown(
  { label, description, value, mutate, error, fetching, success, values }: {
    label: string;
    description?: string;
    value: string;
    values: string[];
    mutate: (value: string) => void;
    error?: ErrorType | null;
    fetching: boolean;
    success: boolean;
  }): JSX.Element {
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
    <Container title={<>
      <p className="font-bold mr-auto">{label}</p>
      {internalFetching && <MoonLoader size={18} color="white" />}
      {internalError && <Error error={internalError} size="small" />}
      {internalSuccess && <Check size={20} color={"green"} strokeWidth={4} />}
    </>}>
      <p className="text-secondary-text mb-2">{description}</p>
      <Dropdown
        defaultValue={value}
        onSelect={(value) => {
          setEdited(true);
          mutate(value);
        }}
        values={values}
        color="bg-neutral-300 hover:bg-neutral-400"
      />
    </Container>
  )
}