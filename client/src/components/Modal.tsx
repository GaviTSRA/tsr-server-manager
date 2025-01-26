import { useState, useCallback } from "react";
import { Check, X } from "react-feather";
import { MoonLoader } from "react-spinners";
import { Input } from "./Input";

type ModalData = {
  isOpen: boolean;
  isFetching: boolean;
  error: boolean;
  success: boolean;
  title: string;
  description: string;
  requireInput: boolean;
  onConfirm: (input: string | undefined) => void;
  onCancel: () => void
}

export const useModal = () => {
  const [modalData, setModalData] = useState({
    isOpen: false,
    title: "",
    description: "",
    isFetching: false,
    error: false,
    success: false,
    requireInput: false,
    onConfirm: (_) => { },
    onCancel: () => { },
  } as ModalData);

  const openModal = useCallback((
    title: string,
    description: string,
    requireInput: boolean,
    onConfirm: (input: string | undefined) => void,
    onCancel: () => void
  ) => {
    setModalData({
      isOpen: true,
      isFetching: false,
      error: false,
      success: false,
      title,
      description,
      requireInput,
      onConfirm,
      onCancel,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalData((prev) => ({ ...prev, isOpen: false }));
  }, []);
  const fetching = useCallback(() => {
    setModalData((prev) => ({ ...prev, isFetching: true }));
  }, []);
  const error = useCallback(() => {
    setModalData((prev) => ({ ...prev, isFetching: false, error: true }));
  }, []);
  const success = useCallback(() => {
    setModalData((prev) => ({ ...prev, isFetching: false, success: true }));
  }, []);

  return {
    data: modalData,
    open: openModal,
    close: closeModal,
    fetching,
    success,
    error,
  };
};

function Modal({ data }: {
  data: ModalData
}) {
  if (!data.isOpen) return null;
  const [input, setInput] = useState(undefined as string | undefined)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
      onClick={(e) => {
        e.stopPropagation();
        if (!(data.isFetching || data.success)) {
          e.stopPropagation();
          data.onCancel();
        }
      }}
    >
      <div
        className="bg-neutral-300 rounded-lg p-4 shadow-lg max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold">{data.title}</h2>
        <p className="mt-2 text-secondary-text">{data.description}</p>
        {
          data.requireInput && (
            <Input
              onValueChange={(value) => setInput(value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  data.onConfirm(input);
                }
              }}
              className="bg-neutral-400 rounded border-neutral-500 mt-2"
            />
          )
        }
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onCancel();
            }}
            className="px-4 py-2 text-white bg-cancel-normal rounded hover:bg-cancel-hover active:bg-cancel-active disabled:bg-cancel-disabled"
            disabled={data.isFetching || data.success}
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onConfirm(input)
            }}
            className="flex items-center px-4 py-2 text-white bg-confirm-normal rounded hover:bg-confirm-hover active:bg-confirm-active disabled:bg-confirm-disabled transition-colors"
            disabled={data.isFetching || data.success || data.error || (data.requireInput && !input)}
          >
            {data.isFetching && <MoonLoader size={18} color={"white"} />}
            {data.success && <Check size={22} className="text-success" />}
            {data.error && <X size={22} className="text-danger" />}
            {!data.isFetching && !data.error && !data.success && <p>Confirm</p>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
