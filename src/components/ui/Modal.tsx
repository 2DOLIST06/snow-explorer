import React, { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
};

const Modal: React.FC<Props> = ({ open, onClose, children, ariaLabel }) => {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-label={ariaLabel || "Dialog"}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-[95vw] max-w-5xl overflow-auto rounded-2xl bg-white p-3 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-xl leading-none"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
