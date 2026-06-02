"use client";

export function ConfirmButton({
  label,
  message,
  className = "button",
  onConfirm
}: {
  label: string;
  message: string;
  className?: string;
  onConfirm: () => void;
}) {
  return (
    <button
      className={className}
      onClick={() => {
        if (window.confirm(message)) onConfirm();
      }}
    >
      {label}
    </button>
  );
}
