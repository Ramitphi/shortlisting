"use client";

import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CardChip } from "./card-bits";
import { DocumentDialog } from "./document-dialog";
import { FileGlyph, FILE_ACCEPT } from "./file-tile";
import {
  IconCheck,
  IconCloudUpload,
  IconEye,
  IconTrash,
  IconX,
} from "./icons";

export interface DocRow {
  key: string;
  /** What it is, in plain words. */
  type: string;
  /** The system's own identifier for the slot. */
  label: string;
  category: string;
  optional?: boolean;
  filename?: string;
  verification: "pending" | "verified" | "rejected";
  uploadedByName?: string;
  uploadedAt?: string;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  reason?: string | null;
}

type Action = (formData: FormData) => void | Promise<void>;

/**
 * The learner's document locker, as a checklist rather than a pile of
 * attachments: every slot is listed whether or not it is filled, so "still
 * missing" is as visible as "here it is". Every role reads the same table —
 * what changes is whether the last column can do anything.
 *
 * Uploading is open to whoever currently holds the application; verifying is
 * Ops' alone, since they are the only role that reads the document against the
 * form and says it checks out.
 *
 * Every action is called directly rather than through a `<form action={…}>`.
 * That is deliberate: this table renders inside the counsellor's call wizard,
 * which is itself one big form, and a nested <form> is invalid HTML that makes
 * React throw away the whole server render on hydration. This codebase has
 * already lost a day to exactly that.
 */
export function DocumentTable({
  rows,
  categories,
  canUpload,
  canVerify,
  upload,
  remove,
  verify,
  note,
}: {
  rows: DocRow[];
  categories: readonly string[];
  canUpload: boolean;
  canVerify: boolean;
  /** Bound to the application; the row binds its own key on top. */
  upload: (docKey: string, formData: FormData) => void | Promise<void>;
  remove: (docKey: string) => void | Promise<void>;
  verify: (docKey: string, formData: FormData) => void | Promise<void>;
  note?: string;
}) {
  const [rejecting, setRejecting] = useState<DocRow | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  /** Run a server action, then pull the fresh rows back down. */
  const run = (fn: () => void | Promise<void>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  const uploaded = rows.filter((r) => r.filename).length;
  const verified = rows.filter((r) => r.verification === "verified").length;
  const missing = rows.filter((r) => !r.filename && !r.optional).length;

  return (
    <>
      {/* A count first: the point of a checklist is the shortfall, and reading
          29 rows to work it out is not a summary. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-paper px-4 py-3">
        <Tally value={uploaded} total={rows.length} label="uploaded" />
        {/* Out of what was uploaded, not out of every slot — a document that
            isn't there cannot be verified, so counting the empty slots against
            the total makes the number meaningless.

            "verified", not "verified by Ops": the learner reads this table too,
            and which desk inside upGrad checked their marksheet is not
            something they were ever meant to be told. */}
        <Tally value={verified} total={uploaded} label="verified" />
        {missing > 0 && (
          <span className="text-[12.5px] text-[#8a6d2f]">
            {missing} required document{missing === 1 ? "" : "s"} still missing
          </span>
        )}
        {note && (
          <span className="ml-auto text-[12px] text-caption">{note}</span>
        )}
      </div>

      {/* Three columns and no horizontal scroll. The file's name lives under
          the document type rather than in a column of its own, and one status
          replaces the old uploaded/verified pair — a document that isn't there
          can't be verified, so the two were never independent. */}
      <div
        className={`rounded-xl border border-line transition-opacity ${
          busy ? "opacity-60" : ""
        }`}
      >
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-paper">
              <Th>Document</Th>
              <Th className="w-[140px]">Status</Th>
              <Th className="w-[130px] text-right">Actions</Th>
            </tr>
          </thead>
          {categories.map((cat) => {
            const group = rows.filter((r) => r.category === cat);
            if (group.length === 0) return null;
            return (
              <tbody key={cat}>
                <tr>
                  <td
                    colSpan={3}
                    className="border-b border-line bg-cream/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-caption"
                  >
                    {cat}
                    <span className="ml-2 font-normal normal-case tracking-normal text-caption/70">
                      {group.filter((r) => r.filename).length}/{group.length}
                    </span>
                  </td>
                </tr>
                {group.map((row) => (
                  <Row
                    key={row.key}
                    row={row}
                    canUpload={canUpload}
                    canVerify={canVerify}
                    onUpload={(filename) => {
                      const fd = new FormData();
                      fd.set("filename", filename);
                      run(() => upload(row.key, fd));
                    }}
                    onRemove={() => run(() => remove(row.key))}
                    onVerify={() => {
                      const fd = new FormData();
                      fd.set("verdict", "verified");
                      run(() => verify(row.key, fd));
                    }}
                    onReject={() => setRejecting(row)}
                  />
                ))}
              </tbody>
            );
          })}
        </table>
      </div>

      {rejecting && (
        <RejectDialog
          row={rejecting}
          onReject={(reason) => {
            const fd = new FormData();
            fd.set("verdict", "rejected");
            fd.set("reason", reason);
            const key = rejecting.key;
            setRejecting(null);
            run(() => verify(key, fd));
          }}
          onClose={() => setRejecting(null)}
        />
      )}
    </>
  );
}

function Tally({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label: string;
}) {
  return (
    <span className="text-[12.5px] text-body">
      <b className="font-semibold text-ink">
        {value}/{total}
      </b>{" "}
      {label}
    </span>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-caption ${className}`}
    >
      {children}
    </th>
  );
}

const iconBtn =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-caption transition-colors hover:bg-muted hover:text-ink";

function Row({
  row,
  canUpload,
  canVerify,
  onUpload,
  onRemove,
  onVerify,
  onReject,
}: {
  row: DocRow;
  canUpload: boolean;
  canVerify: boolean;
  onUpload: (filename: string) => void;
  onRemove: () => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  const filled = Boolean(row.filename);

  return (
    <tr className="border-b border-line last:border-0 hover:bg-paper/60">
      {/* Type on top, what's actually attached underneath — the filename is
          the thing a person reads, so it doesn't need a column of its own. */}
      <td className="px-4 py-2.5 align-middle">
        <div className="flex items-center gap-2.5">
          {filled ? (
            <FileGlyph filename={row.filename!} small />
          ) : (
            <span
              className="h-7 w-7 shrink-0 rounded-lg border border-dashed border-line-strong"
              aria-hidden
            />
          )}
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-ink">
              {row.type}
              {row.optional && (
                <span className="ml-1.5 text-[11.5px] font-normal text-caption">
                  if applicable
                </span>
              )}
            </div>
            <div className="truncate text-[11.5px] text-caption">
              {filled ? row.filename : row.label}
            </div>
          </div>
        </div>
      </td>

      {/* One status, one chip family. "Uploaded" was never information on its
          own: a document that isn't there can't be verified, so the two
          collapse into one. Empty is an outline, present-but-unchecked is a
          grey tick, checked is a green one — same object, different tone. */}
      <td className="px-4 py-2.5 align-middle">
        {!filled ? (
          <CardChip tone="outline">Not uploaded</CardChip>
        ) : row.verification === "verified" ? (
          <CardChip
            tone="green"
            tooltip={`Verified by ${row.verifiedByName ?? "Ops"}${
              row.verifiedAt ? ` on ${row.verifiedAt.slice(0, 10)}` : ""
            }`}
          >
            <IconCheck className="h-3 w-3" />
            Verified
          </CardChip>
        ) : row.verification === "rejected" ? (
          <CardChip tone="red" tooltip={row.reason ?? undefined}>
            <IconX className="h-3 w-3" />
            Rejected
          </CardChip>
        ) : (
          <CardChip tone="muted">
            <IconCheck className="h-3 w-3" />
            Not verified
          </CardChip>
        )}
      </td>

      <td className="px-4 py-2.5 align-middle">
        <div className="flex items-center justify-end gap-0.5">
          {filled ? (
            <>
              <DocumentDialog
                docType={row.label}
                title={row.type}
                content={`${row.filename}\n\nUploaded by ${
                  row.uploadedByName ?? "—"
                }${row.uploadedAt ? ` on ${row.uploadedAt.slice(0, 10)}` : ""}.\n\nUploads are filenames in this prototype, so there is no file to render — this is where the document itself would appear.`}
                triggerLabel={<IconEye className="h-4 w-4" />}
                triggerClassName={iconBtn}
              />
              {canVerify && (
                <>
                  <button
                    type="button"
                    onClick={onVerify}
                    title="Mark verified"
                    aria-label="Mark verified"
                    disabled={row.verification === "verified"}
                    className={`${iconBtn} hover:bg-[#e8f2e9] hover:text-[#3f6c45] disabled:opacity-30 disabled:hover:bg-transparent`}
                  >
                    <IconCheck className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onReject}
                    title="Reject"
                    aria-label="Reject document"
                    className={`${iconBtn} hover:bg-accent/10 hover:text-accent`}
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </>
              )}
              {/* Remove only. Nobody replaces a document for any reason other
                  than putting a better one in its place, so Remove and then
                  Upload is the same journey with one fewer control. */}
              {canUpload && (
                <button
                  type="button"
                  onClick={onRemove}
                  title="Remove"
                  aria-label="Remove document"
                  className={`${iconBtn} hover:bg-accent/10 hover:text-accent`}
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              )}
            </>
          ) : canUpload ? (
            <PickFile
              onPick={onUpload}
              title="Upload"
              className="btn-secondary !h-8 !px-3 !text-[12.5px]"
              icon={
                <>
                  <IconCloudUpload className="h-4 w-4" />
                  Upload
                </>
              }
            />
          ) : (
            <span className="text-[12.5px] text-caption">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Pick a file and hand its name straight up. There is no staging step: a file
 * sitting in a row that nobody submitted looks uploaded and isn't.
 */
function PickFile({
  onPick,
  title,
  className,
  icon,
}: {
  onPick: (filename: string) => void;
  title: string;
  className: string;
  icon: React.ReactNode;
}) {
  const picker = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={picker}
        type="file"
        className="hidden"
        accept={FILE_ACCEPT}
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Re-picking the same file has to fire again, so clear the input.
          e.target.value = "";
          if (file) onPick(file.name);
        }}
      />
      <button
        type="button"
        title={title}
        aria-label={title}
        onClick={() => picker.current?.click()}
        className={className}
      >
        {icon}
      </button>
    </>
  );
}

/**
 * Rejecting without saying why leaves the learner re-uploading the same file.
 * The reason is the whole message, so it is asked for rather than optional.
 */
function RejectDialog({
  row,
  onReject,
  onClose,
}: {
  row: DocRow;
  onReject: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  if (typeof document === "undefined") return null;

  const submit = () => {
    if (reason.trim()) onReject(reason.trim());
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] rounded-2xl border border-line bg-white p-6 shadow-[0_32px_64px_-24px_rgba(49,48,43,0.5)]"
      >
        <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink">
          Reject {row.type}
        </h3>
        <p className="mt-1 text-[13px] text-body">
          The learner is notified with your reason and can upload a replacement.
        </p>
        <input
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
          placeholder="e.g. Page 2 is missing"
          className="input mt-4"
        />
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!reason.trim()}
            className="btn-primary flex-1"
          >
            Reject document
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

