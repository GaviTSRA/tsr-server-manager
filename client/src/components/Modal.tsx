import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Check, X } from "react-feather";
import { MoonLoader } from "react-spinners";
import { Button } from "./Button";

enum ModalState {
  IDLE,
  FETCHING,
  ERROR,
  SUCCESS,
}

type ModalTab = {
  title: string;
  description: string;
  continueEnabled?: boolean;
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={(e) => {
            e.stopPropagation();
            if (!(state === ModalState.FETCHING)) {
              setIsOpen(false);
            }
          }}
        >
          <motion.div
            className="bg-neutral-200 border-neutral-400 border-1 rounded-lg p-4 shadow-lg max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-xl font-bold">{tab.title}</h2>
            <p className="mt-2 text-secondary-text">{tab.description}</p>
            <AnimatePresence mode="wait">
              {tab.body && (
                <motion.div
                  className="mt-4"
                  key={currentTab}
                  initial={{ x: -50, opacity: 0, height: "4rem" }}
                  animate={{ x: 0, opacity: 1, height: "auto" }}
                  exit={{ x: 50, opacity: 0, height: "4rem" }}
                  transition={{ duration: 0.1 }}
                >
                  {tab.body}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-4 flex justify-end space-x-2">
              <Button
                onClick={() => {
                  tab.onCancel?.();
                  if (currentTab === 0) {
                    close();
                  } else {
                    previousTab();
                  }
                }}
                disabled={
                  state === ModalState.FETCHING || state === ModalState.SUCCESS
                }
              >
                <p>{currentTab === 0 ? "Cancel" : "Back"}</p>
              </Button>
              <Button
                onClick={() => {
                  tab.onConfirm?.();
                  if (currentTab !== tabs.length - 1) {
                    nextTab();
                  }
                }}
                disabled={
                  state === ModalState.FETCHING ||
                  state === ModalState.SUCCESS ||
                  tab.continueEnabled === false
                }
                variant="confirm"
              >
                <>
                  {state === ModalState.FETCHING && (
                    <MoonLoader size={18} color={"white"} />
                  )}
                  {state === ModalState.SUCCESS && (
                    <Check size={22} className="text-success" />
                  )}
                  {state === ModalState.ERROR && (
                    <X size={22} className="text-danger" />
                  )}
                  {state === ModalState.IDLE && (
                    <p>
                      {currentTab === tabs.length - 1 ? "Confirm" : "Continue"}
                    </p>
                  )}
                </>
              </Button>
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
