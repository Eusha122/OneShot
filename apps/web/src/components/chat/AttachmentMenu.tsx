import React, { useEffect, useRef } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import type { SubjectType } from "../../lib/chatApi";

const SUBJECTS: { value: SubjectType; label: string }[] = [
  { value: "auto",               label: "Auto"       },
  { value: "physics",            label: "Physics"    },
  { value: "chemistry",          label: "Chemistry"  },
  { value: "biology",            label: "Biology"    },
  { value: "mathematics",        label: "Maths"      },
  { value: "higher-mathematics", label: "Higher Math"},
  { value: "ict",                label: "ICT"        },
  { value: "general",            label: "General"    },
];

interface AttachmentMenuProps {
  onClose: () => void;
  onUploadPdf: () => void;
  onUploadImage: () => void;
  selectedSubject: SubjectType;
  onSubjectChange: (subject: SubjectType) => void;
}

export function AttachmentMenu({
  onClose,
  onUploadPdf,
  onUploadImage,
  selectedSubject,
  onSubjectChange,
}: AttachmentMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    const id = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const uploadBtnClass =
    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#e5e5e5] transition-colors hover:bg-white/10 active:bg-white/5 text-left";

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute bottom-[60px] left-0 z-50 w-64 overflow-hidden rounded-2xl p-2"
      style={{
        background: "rgba(20, 20, 20, 0.95)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45)",
      }}
    >
      {/* Subject picker */}
      <p className="mb-2 px-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">
        Subject
      </p>
      <div className="mb-2 flex flex-wrap gap-1.5 px-1.5">
        {SUBJECTS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onSubjectChange(s.value)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all active:scale-95 ${
              selectedSubject === s.value
                ? "bg-white/15 text-white ring-1 ring-white/20"
                : "text-[#9ca3af] hover:bg-white/8 hover:text-[#e5e5e5]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-2 mb-1.5 h-px bg-white/[0.07]" />

      {/* Upload options */}
      <button
        onClick={() => { onUploadPdf(); onClose(); }}
        className={uploadBtnClass}
      >
        <FileText size={17} className="shrink-0 text-[#9ca3af]" />
        <span className="font-medium">Upload PDF</span>
      </button>

      <button
        onClick={() => { onUploadImage(); onClose(); }}
        className={uploadBtnClass}
      >
        <ImageIcon size={17} className="shrink-0 text-[#9ca3af]" />
        <span className="font-medium">Upload Image</span>
      </button>
    </motion.div>
  );
}
