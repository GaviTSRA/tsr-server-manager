import { useState, useCallback } from "react";
import { Check, X } from "react-feather";
import { MoonLoader } from "react-spinners";

type ModalData = {
  isOpen: boolean;
  isFetching: boolean;
  error: boolean;
  success: boolean;
  title: string;
  description: string;
  onConfirm: ((event: React.MouseEvent) => void);
  onCancel: ((event: React.MouseEvent) => void)
}

export const useModal = () => {
  const [modalData, setModalData] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: (_) => { },
    onCancel: (_) => { },
  } as ModalData);

  const openModal = useCallback((
    title: string,
    description: string,
    onConfirm: (event: React.MouseEvent) => void,
    onCancel: (event: React.MouseEvent) => void
  ) => {
    setModalData({
      isOpen: true,
      isFetching: false,
      error: false,
      success: false,
      title,
      description,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
      onClick={(e) => {
        e.stopPropagation();
        data.onCancel(e);
      }}
    >
      <div
        className="bg-neutral-300 rounded-lg p-4 shadow-lg max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold">{data.title}</h2>
        <p className="mt-2 text-secondary-text">{data.description}</p>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={data.onCancel}
            className="px-4 py-2 text-white bg-cancel-normal rounded hover:bg-cancel-hover active:bg-cancel-active disabled:bg-cancel-disabled"
            disabled={data.isFetching || data.success}
          >
            Cancel
          </button>
          <button
            onClick={data.onConfirm}
            className="flex items-center px-4 py-2 text-white bg-confirm-normal rounded hover:bg-confirm-hover active:bg-confirm-active disabled:bg-confirm-disabled transition-colors"
            disabled={data.isFetching || data.success || data.error}
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
