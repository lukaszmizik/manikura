"use client";

import { useState, useCallback, useRef } from "react";
import imageCompression from "browser-image-compression";
import { Upload, Loader2 } from "lucide-react";

const MAX_SIZE_BYTES = 500 * 1024; // 500 kB
const MAX_SIZE_MB = MAX_SIZE_BYTES / (1024 * 1024);

export type PhotoUploadProps = {
  /** Volá se s polem zkomprimovaných souborů (každý max 500 kB). */
  onFilesReady: (files: File[]) => void | Promise<void>;
  /** Volá se při chybě komprese nebo při neplatném typu souboru. */
  onError?: (message: string) => void;
  disabled?: boolean;
  accept?: string;
  multiple?: boolean;
  /** Text na tlačítku / v drop zóně. */
  label?: string;
  /** Text během komprese. */
  compressingLabel?: string;
  className?: string;
};

export function PhotoUpload({
  onFilesReady,
  onError,
  disabled = false,
  accept = "image/*",
  multiple = true,
  label = "Vyberte fotky (max 500 kB každá)",
  compressingLabel = "Komprimuji…",
  className = "",
}: PhotoUploadProps) {
  const [compressing, setCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const compressFile = useCallback(async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Lze nahrát pouze obrázky.");
    }
    const opts = {
      maxSizeMB: MAX_SIZE_MB,
      useWebWorker: true,
      maxWidthOrHeight: 1920,
      initialQuality: 0.9,
    };
    let result = await imageCompression(file, opts);
    if (result.size > MAX_SIZE_BYTES) {
      const lowerQuality = await imageCompression(file, {
        ...opts,
        initialQuality: 0.6,
        maxSizeMB: MAX_SIZE_MB,
      });
      result = lowerQuality;
    }
    return result;
  }, []);

  const processFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const imageFiles = Array.from(fileList).filter((f) =>
        f.type.startsWith("image/")
      );
      if (!imageFiles.length) {
        onError?.("Vyberte alespoň jeden obrázek.");
        return;
      }
      setCompressing(true);
      try {
        const compressed: File[] = [];
        for (const file of imageFiles) {
          const c = await compressFile(file);
          compressed.push(c);
        }
        await onFilesReady(compressed);
      } catch (e) {
        onError?.(e instanceof Error ? e.message : "Chyba komprese.");
      } finally {
        setCompressing(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [compressFile, onFilesReady, onError]
  );

  const busy = compressing || disabled;

  return (
    <label
      className={
        "flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/50 cursor-pointer hover:border-primary-400 focus-within:ring-2 focus-within:ring-primary-400 " +
        (busy ? "opacity-70 pointer-events-none " : "") +
        className
      }
    >
      {compressing ? (
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      ) : (
        <Upload className="w-8 h-8 text-primary-500" />
      )}
      <span className="text-sm font-medium text-primary-700">
        {compressing ? compressingLabel : label}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          processFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
