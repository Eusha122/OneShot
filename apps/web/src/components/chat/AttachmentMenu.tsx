import React, { useEffect, useRef } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

interface AttachmentMenuProps {
  onClose: () => void;
  onUploadPdf: () => void;
  onUploadImage: () => void;
}

export function AttachmentMenu({ onClose, onUploadPdf, onUploadImage }: AttachmentMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    // Add event listener with a slight delay to prevent immediate trigger from the open button
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const buttonClass = "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#e5e5e5] transition-colors hover:bg-white/10 active:bg-white/5 text-left";

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute bottom-[60px] left-0 z-50 flex w-56 flex-col overflow-hidden rounded-2xl p-1.5"
      style={{
        background: "rgba(20, 20, 20, 0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
      }}
    >
      <button
        onClick={() => {
          onUploadPdf();
          onClose();
        }}
        className={buttonClass}
      >
        <FileText size={18} className="shrink-0 text-[#9ca3af]" />
        <span className="font-medium">Upload PDF</span>
      </button>

      <button
        onClick={() => {
          onUploadImage();
          onClose();
        }}
        className={buttonClass}
      >
        <ImageIcon size={18} className="shrink-0 text-[#9ca3af]" />
        <span className="font-medium">Upload Image</span>
      </button>
    </motion.div>
  );
}
