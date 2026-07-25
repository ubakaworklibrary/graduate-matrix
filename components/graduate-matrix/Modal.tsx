"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

const modalStack: symbol[] = [];
let scrollLockCount = 0;
let originalBodyOverflow = "";

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  size?: "md" | "lg" | "xl" | "workspace" | "response" | "mentor-review";
}

export default function Modal({ title, onClose, children, footer, size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalId = useRef(Symbol("modal"));
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const id = modalId.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalStack.push(id);

    if (scrollLockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    scrollLockCount += 1;

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack.at(-1) !== id) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      const stackIndex = modalStack.lastIndexOf(id);
      if (stackIndex >= 0) modalStack.splice(stackIndex, 1);
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0) document.body.style.overflow = originalBodyOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  const sizeClass = size === "lg" ? "gm-modal-lg" : size === "xl" ? "gm-modal-xl" : size === "workspace" ? "gm-modal-workspace" : size === "response" ? "gm-modal-response" : size === "mentor-review" ? "gm-modal-mentor-review" : "";
  return createPortal(
    <div className={`gm-modal-backdrop ${size === "response" ? "gm-modal-backdrop-response" : size === "mentor-review" ? "gm-modal-backdrop-mentor-review" : ""}`} onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className={`gm-modal ${sizeClass}`} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="gm-modal-header"><span id={titleId}>{title}</span><button ref={closeButtonRef} type="button" className="gm-modal-header-close" onClick={onClose} aria-label={`Close ${title}`}>Close</button></div>
        <div className="gm-modal-body">{children}</div>
        <div className="gm-modal-footer">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}
