import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Empty({
  text = "No records yet. Add your first one to get started.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol">＋</span>
      <p>{text}</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function MoneyType({ type }: { type: string }) {
  return (
    <span
      className={"direction " + (type === "INCOME" ? "positive" : "negative")}
    >
      {type === "INCOME" ? (
        <ArrowDownLeft size={18} />
      ) : (
        <ArrowUpRight size={18} />
      )}
    </span>
  );
}
export function Progress({ value }: { value: number }) {
  return (
    <div
      className={"progress " + (value >= 100 ? "over" : "")}
      role="progressbar"
      aria-valuenow={Math.min(100, Math.max(0, value))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
