"use client";

import { useState } from "react";
import { DocumentDialog } from "./document-dialog";
import {
  IconCloudUpload,
  IconDoc,
  IconEye,
  IconImage,
  IconSwap,
  IconTrash,
} from "./icons";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic,.docx";

/**
 * Colour by file type. The tile is a quiet tinted square with a line glyph —
 * the extension is already in the filename, so stamping it on the icon too is
 * just noise.
 */
const TYPES: Record<string, string> = {
  pdf: "bg-[#fbeaea] text-[#c0392f]",
  doc: "bg-[#e9eff9] text-[#2f5aa8]",
  docx: "bg-[#e9eff9] text-[#2f5aa8]",
  jpg: "bg-[#eaf1ec] text-[#3f6c45]",
  jpeg: "bg-[#eaf1ec] text-[#3f6c45]",
  png: "bg-[#eaf1ec] text-[#3f6c45]",
  heic: "bg-[#eaf1ec] text-[#3f6c45]",
};

export const FILE_ACCEPT = ACCEPT;

const IMAGES = new Set(["jpg", "jpeg", "png", "heic", "webp", "gif"]);
const extOf = (f: string) => f.split(".").pop()?.toLowerCase() ?? "";

/**
 * An image shows itself; everything else shows a document icon carrying its
 * type. The thumbnail only exists for a file picked in this session — uploads
 * are stored as filenames, so there are no bytes to render after a reload.
 */
export function FileGlyph({
  filename,
  preview,
  small,
}: {
  filename: string;
  preview?: string;
  small?: boolean;
}) {
  const ext = extOf(filename);
  const box = small ? "h-7 w-7 rounded-lg" : "h-10 w-10 rounded-xl";

  // An image shows itself. The thumbnail only exists for a file picked in this
  // session — uploads are stored as filenames, so after a reload there are no
  // bytes to render.
  if (preview && IMAGES.has(ext)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={preview}
        alt=""
        aria-hidden
        className={`${box} shrink-0 border border-line object-cover`}
      />
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center ${box} ${
        TYPES[ext] ?? "bg-cream text-caption"
      }`}
      aria-hidden
    >
      {IMAGES.has(ext) ? (
        <IconImage className={small ? "h-3.5 w-3.5" : "h-[18px] w-[18px]"} />
      ) : (
        <IconDoc className={small ? "h-3.5 w-3.5" : "h-[18px] w-[18px]"} />
      )}
    </span>
  );
}

/**
 * A read-only attachment, for the generic label/value views Ops and the
 * counsellor read. Those rendered uploads as bare filenames, so the one role
 * whose job is reading the documents had no way to open them.
 */
export function FileValue({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value) return <span className="text-caption">—</span>;
  return (
    <span className="mt-1 inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-white py-1 pl-1 pr-1.5">
      <FileGlyph filename={value} small />
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-body">
        {value}
      </span>
      <DocumentDialog
        docType="Uploaded document"
        title={label}
        content={`${value}\n\nUploads are filenames in this prototype, so there is no file to render — this is where the document itself would appear.`}
        triggerLabel={<IconEye className="h-3.5 w-3.5" />}
        triggerClassName="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-caption transition-colors hover:bg-muted hover:text-ink"
      />
    </span>
  );
}

/**
 * An upload slot, shared by the counsellor's call form and the learner's own
 * details. Empty slots are a drop zone; filled ones offer View, Replace and
 * Remove — a filled slot you can only click to re-pick gives you no way to
 * check what is actually attached.
 *
 * Filled slots stay neutral rather than green: green would read as "approved"
 * when it only means "present", and Ops is the one who approves.
 */
export function FileTile({
  label,
  value,
  onChange,
  name,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Posts the filename with the form, since uploads are names here. */
  name?: string;
  /** Read-only — view it, but no replacing or removing. */
  disabled?: boolean;
}) {
  const [over, setOver] = useState(false);
  const [preview, setPreview] = useState<string | undefined>();
  const take = (f?: File | null) => {
    if (!f) return;
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return IMAGES.has(extOf(f.name)) ? URL.createObjectURL(f) : undefined;
    });
    onChange(f.name);
  };
  const inputId = `file-${label.replace(/\W+/g, "-").toLowerCase()}`;
  const picker = (
    <input
      id={inputId}
      type="file"
      className="hidden"
      accept={ACCEPT}
      onChange={(e) => take(e.target.files?.[0])}
    />
  );

  if (!value) {
    return (
      <label
        htmlFor={disabled ? undefined : inputId}
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
          disabled
            ? "cursor-not-allowed border-line-strong opacity-60"
            : over
              ? "cursor-pointer border-ink bg-cream/50"
              : "cursor-pointer border-line-strong hover:border-ink/40 hover:bg-paper"
        }`}
      >
        <IconCloudUpload className="h-6 w-6 text-caption" />
        <span className="mt-2 block text-[13px] font-medium text-ink">
          {label}
        </span>
        <span className="mt-0.5 block text-[12.5px] text-body">
          {disabled ? (
            "Not provided"
          ) : (
            <>
              Drop your file here, or{" "}
              <span className="font-medium text-accent">click to browse</span>
            </>
          )}
        </span>
        {!disabled && (
          <span className="mt-1 block text-[11.5px] text-caption">
            PDF, JPG, PNG or DOCX · one file
          </span>
        )}
        {!disabled && picker}
        {name && <input type="hidden" name={name} value="" />}
      </label>
    );
  }

  const iconBtn =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-caption transition-colors hover:bg-muted hover:text-ink";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
      <FileGlyph filename={value} preview={preview} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{label}</div>
        <div className="truncate text-[12px] text-caption">{value}</div>
      </div>

      {/* Actions sit on the right as icons — three full-width buttons stacked
          under a one-line file was more chrome than the file itself. */}
      <div className="flex shrink-0 items-center gap-0.5">
        <DocumentDialog
          docType="Uploaded document"
          title={label}
          content={`${value}\n\nUploads are filenames in this prototype, so there is no file to render — this is where the document itself would appear.`}
          triggerLabel={<IconEye className="h-4 w-4" />}
          triggerClassName={iconBtn}
        />
        {!disabled && (
          <>
            <label htmlFor={inputId} title="Replace" className={`${iconBtn} cursor-pointer`}>
              <IconSwap className="h-4 w-4" />
              <span className="sr-only">Replace document</span>
              {picker}
            </label>
            <button
              type="button"
              onClick={() => onChange("")}
              title="Remove"
              aria-label="Remove document"
              className={`${iconBtn} hover:bg-accent/10 hover:text-accent`}
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
