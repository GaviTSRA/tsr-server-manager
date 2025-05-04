import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Check, X } from "react-feather";
import { MoonLoader } from "react-spinners";

enum ModalState {
  IDLE,
  FETCHING,
  ERROR,
  SUCCESS,
}

type ModalTab = {
  title: string;
  description: string;
  body?: JSX.Element;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export const useModal = (tabs: ModalTab[]) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState(ModalState.IDLE);

  const open = () => setIsOpen(true);
  const close = () => {
    setIsOpen(false);
    setState(ModalState.IDLE);
    setCurrentTab(0);
  };
  const fetching = () => setState(ModalState.FETCHING);
  const error = () => setState(ModalState.ERROR);
  const success = () => setState(ModalState.SUCCESS);
  const nextTab = () => setCurrentTab((prev) => prev + 1);
  const previousTab = () => setCurrentTab((prev) => prev - 1);

  const tab = tabs[currentTab];

  const Modal = (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={(e) => {
            e.stopPropagation();
            if (!(state === ModalState.FETCHING)) {
              setIsOpen(false);
            }
          }}
        >
          <motion.div
            className="bg-neutral-200 rounded-lg p-4 shadow-lg max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-bold">{tab.title}</h2>
            <p className="mt-2 text-secondary-text">{tab.description}</p>
            <AnimatePresence mode="wait">
              {tab.body && (
                <motion.div
                  className="mt-4"
                  key={currentTab}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 10, opacity: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  {tab.body}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  tab.onCancel?.();
                  if (currentTab === 0) {
                    close();
                  } else {
                    previousTab();
                  }
                }}
                className="px-4 py-2 text-white bg-cancel-normal rounded-sm hover:bg-cancel-hover active:bg-cancel-active disabled:bg-cancel-disabled"
                disabled={
                  state === ModalState.FETCHING || state === ModalState.SUCCESS
                }
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  tab.onConfirm?.();
                  if (currentTab !== tabs.length - 1) {
                    nextTab();
                  }
                }}
                className="flex items-center px-4 py-2 text-white bg-confirm-normal rounded-sm hover:bg-confirm-hover active:bg-confirm-active disabled:bg-confirm-disabled transition-colors"
                disabled={
                  state === ModalState.FETCHING || state === ModalState.SUCCESS
                }
              >
                {state === ModalState.FETCHING && (
                  <MoonLoader size={18} color={"white"} />
                )}
                {state === ModalState.SUCCESS && (
                  <Check size={22} className="text-success" />
                )}
                {state === ModalState.ERROR && (
                  <X size={22} className="text-danger" />
                )}
                {state === ModalState.IDLE && <p>Confirm</p>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );

  return {
    Modal,
    open,
    close,
    fetching,
    success,
    error,
  };
};
