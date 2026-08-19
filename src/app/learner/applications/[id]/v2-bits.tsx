"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocumentDialog, useToast, type DocRow, FILE_ACCEPT } from "@/components/ui";

/**
 * v2 learner pieces built from the capture's OWN code.
 *
 * Every class string and the table cell structure here is lifted verbatim
 * from the saved "Upload Documents" page; the definitions live in the site's
 * compiled stylesheet at /upgrad/site.css and the icons are its icomoon font
 * (both shipped locally). Behaviour — uploads, previews, certification — is
 * our server actions underneath the site's markup.
 */

export function V2DocsTable({
  rows,
  canUpload,
  upload,
  remove,
}: {
  rows: DocRow[];
  canUpload: boolean;
  upload: (docKey: string, formData: FormData) => void | Promise<void>;
  remove: (docKey: string) => void | Promise<void>;
}) {
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const pendingKey = useRef<string | null>(null);

  const pick = (key: string) => {
    pendingKey.current = key;
    picker.current?.click();
  };

  return (
    <div className={busy ? "opacity-60 transition-opacity" : ""}>
      {/* Capture: the colour-format note above the table */}
      <h5 className="font-medium mb-spacing8">
        <span className="text-required">*</span>All documents must be uploaded
        in color format.
      </h5>

      {/* One hidden picker for the whole table — the row remembers which
          slot asked for it. */}
      <input
        ref={picker}
        type="file"
        className="hidden"
        accept={FILE_ACCEPT}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          const key = pendingKey.current;
          pendingKey.current = null;
          if (!file || !key) return;
          const fd = new FormData();
          fd.set("filename", file.name);
          startTransition(async () => {
            await upload(key, fd);
            router.refresh();
          });
        }}
      />

      {/* Capture table, cell for cell */}
      <table className="min-w-full bg-white mb-spacing32">
        <thead className="border-b border-t border-greyscale-8 rounded bg-light-grey-5">
          <tr>
            <th className="w-60 h-56 py-spacing20 pl-spacing16 pr-spacing32  text-left text-user-title-text font-medium text-underlineNormal2 rounded-tl-lg rounded-bl-lg">
              Document Name
            </th>
            <th className="w-60 h-56 py-spacing20 px-spacing32 text-left text-user-title-text font-medium text-underlineNormal2">
              Description
            </th>
            <th className="w-60 h-56 py-spacing20 px-spacing28 text-left text-user-title-text font-medium text-underlineNormal2">
              Upload Status
            </th>
            <th className="w-60 h-56 py-spacing20 px-spacing40 text-left text-user-title-text font-medium text-underlineNormal2">
              Verification Status
            </th>
            <th className="w-78 h-56 py-spacing20 px-spacing40 text-left text-user-title-text font-medium text-underlineNormal2" />
            <th className="w-60 h-56 py-spacing20 px-spacing16 text-left text-user-title-text font-medium text-underlineNormal2 rounded-tr-lg rounded-br-lg" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const filled = Boolean(r.filename);
            const rejected = r.verification === "rejected";
            return (
              <tr key={r.key} className="border-b border-greyscale-8">
                <td className="w-60 py-spacing16 pl-spacing16 pr-spacing32">
                  <span className="text-underlineSmall font-normal text-user-title-text">
                    {r.type}
                    {!r.optional && <span className="text-required"> *</span>}
                  </span>
                </td>
                <td className="w-60 py-spacing16 px-spacing32">
                  <div className="flex items-center max-w-154px">
                    <span className="text-underlineSmall font-normal text-user-title-text">
                      Upload your {r.type}
                      {r.optional ? ", if applicable." : "."}
                    </span>
                  </div>
                </td>
                <td className="w-60 py-spacing16 px-spacing28">
                  {filled ? (
                    <div className="w-fit flex items-center gap-spacing6">
                      <i className="icon-checkmark-circle-filled text-darkGreen text-icon-md w-20px h-20px" />
                      <span className="text-underlineSmall font-normal text-user-title-text leading-5">
                        Submitted
                      </span>
                    </div>
                  ) : (
                    <div className="w-fit flex items-center gap-spacing6">
                      <i className="icon-not-submitted text-orange-main-1 text-icon-md w-5 h-5" />
                      <span className="text-underlineSmall font-normal text-user-title-text leading-5">
                        Not-Submitted
                      </span>
                    </div>
                  )}
                </td>
                <td className="w-60 py-spacing16 px-spacing40">
                  {!filled ? null : r.verification === "verified" ? (
                    <div className="w-fit flex items-center gap-spacing4">
                      <i className="icon-document-check text-darkGreen text-icon-md w-20px h-20px" />
                      <span className="text-underlineSmall font-normal text-user-title-text leading-5">
                        Approved
                      </span>
                    </div>
                  ) : rejected ? (
                    <div
                      className="w-fit flex items-center gap-spacing4"
                      title={r.reason ?? undefined}
                    >
                      <i className="icon-not-submitted text-required text-icon-md w-5 h-5" />
                      <span className="text-underlineSmall font-normal text-required leading-5">
                        Rejected
                      </span>
                    </div>
                  ) : (
                    <span className="text-underlineSmall font-normal text-user-title-text leading-5">
                      Pending
                    </span>
                  )}
                  {rejected && r.reason && (
                    <div className="text-underlineSmall text-required leading-5 mt-spacing4">
                      {r.reason}
                    </div>
                  )}
                </td>
                <td className="w-78 py-spacing16 px-spacing40">
                  {filled ? (
                    <DocumentDialog
                      docType={r.label}
                      title={r.type}
                      content={`${r.filename}\n\nUploaded by ${
                        r.uploadedByName ?? "—"
                      }${r.uploadedAt ? ` on ${r.uploadedAt.slice(0, 10)}` : ""}.\n\nUploads are filenames in this prototype, so there is no file to render — this is where the document itself would appear.`}
                      triggerLabel={
                        <span className="w-fit flex items-center gap-spacing6 cursor-pointer">
                          <i
                            title="Preview uploaded document"
                            className="icon-preview text-icon-md w-5 h-5 text-blue-main-1"
                          />
                          <span className="text-underlineSmall font-normal leading-5 text-blue-main-1">
                            Preview
                          </span>
                        </span>
                      }
                      triggerClassName=""
                    />
                  ) : (
                    <div className="w-fit flex items-center gap-spacing6">
                      <i className="icon-preview text-icon-md w-5 h-5 text-greyscale-6" />
                      <span className="text-underlineSmall font-normal leading-5 text-greyscale-6">
                        Preview
                      </span>
                    </div>
                  )}
                </td>
                <td className="w-60 py-spacing16 px-spacing16">
                  {canUpload && (!filled || rejected) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (rejected)
                          startTransition(async () => {
                            await remove(r.key);
                            router.refresh();
                          });
                        pick(r.key);
                      }}
                      className="w-fit flex items-center gap-spacing4 cursor-pointer"
                    >
                      <span className="text-underlineSmall font-normal text-blue-main-1 leading-5">
                        + Add
                      </span>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The capture's consent checkbox + footer buttons, carrying our
 * certification: the checkbox is the learner's statement, Submit is
 * `certifyDetails`, enabled only once every undertaking is signed.
 */
export function V2Certify({
  action,
  allSigned,
  certified,
  certifiedAt,
  backHref,
  recheckFields,
  recheckState,
}: {
  action: () => Promise<void>;
  allSigned: boolean;
  certified: boolean;
  certifiedAt?: string | null;
  backHref: string;
  /**
   * Set while the learner's own edit is being re-checked — Submit is held,
   * because certifying would vouch for values nobody has re-read.
   */
  recheckFields?: string[];
  /** 'ac' = their counsellor is going through it with them. */
  recheckState?: "ops" | "ac";
}) {
  const [agreed, setAgreed] = useState(false);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  if (certified) {
    return (
      <div className="mt-spacing32 flex flex-col md:flex-row md:items-center md:justify-between gap-spacing12 border-t border-greyscale-8 pt-spacing24">
        <div className="w-fit flex items-center gap-spacing6">
          <i className="icon-checkmark-circle-filled text-darkGreen text-icon-md w-20px h-20px" />
          <span className="text-underlineSmall font-normal text-user-title-text leading-5">
            Submitted &amp; certified on {certifiedAt?.slice(0, 10)}
          </span>
        </div>
        <Link
          href={backHref}
          className="w-233 h-11 text-greyscale-main bg-white flex items-center justify-center border rounded-lg border-greyscale-4 px-spacing20 py-spacing10 md:p-0"
        >
          Go Back to My Application
        </Link>
      </div>
    );
  }

  const rechecking = Boolean(recheckFields);
  const canSubmit = agreed && allSigned && !rechecking && !busy;
  const withCounsellor = recheckState === "ac";
  const heldReason = rechecking
    ? withCounsellor
      ? "Your counsellor is going through these with you"
      : "We're still checking the details you changed"
    : !allSigned
      ? "Sign every undertaking above first"
      : "";

  return (
    <div className="mt-spacing32">
      {rechecking && (
        <div className="mb-spacing24 rounded-8 bg-[#FFF4E5] p-spacing16">
          <p className="text-bodySmall font-medium text-[#8a6d2f]">
            {withCounsellor
              ? "Your counsellor will get in touch about these"
              : "We’re checking the details you changed"}
          </p>
          <p className="text-labelNormal text-[#8a6d2f] mt-spacing8">
            {recheckFields && recheckFields.length > 0
              ? `You updated ${recheckFields.slice(0, 3).join(", ")}${
                  recheckFields.length > 3
                    ? ` and ${recheckFields.length - 3} more`
                    : ""
                }. `
              : ""}
            {withCounsellor
              ? "There are a couple of things to go through together. Submit opens up again once that's settled — you can keep signing in the meantime."
              : "Submit opens up again as soon as the check is done — you can keep signing in the meantime."}
          </p>
        </div>
      )}

      {/* Capture: hidden checkbox + styled label + consent paragraph */}
      <div className="flex justify-center items-start gap-spacing8 mb-spacing56">
        <div>
          <input
            id="acknowledgBox"
            className="peer hidden"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <label
            htmlFor="acknowledgBox"
            className="w-18px h-18px flex justify-center items-center bg-white relative border border-solid rounded border-black-russian peer-checked:bg-black-russian cursor-pointer mt-1"
          >
            <i className="icon-checkmark text-xs text-white absolute peer-checked:text-white" />
          </label>
        </div>
        <p className="text-black-russian">
          <span className="text-required">*</span>By checking this box, I
          consent to upGrad using my documents to verify program eligibility
          and sharing them with the university. I confirm that all details
          mentioned in my profile are correct &amp; the documents are
          authentic, not forged, and that the undertakings I have signed may be
          relied upon.
        </p>
      </div>

      {/* Capture: Go Back + Submit pair */}
      <div className="flex flex-col md:flex-row md:justify-end items-center gap-spacing12 md:gap-spacing28">
        <Link
          href={backHref}
          className="w-233 h-11 text-greyscale-main bg-white flex items-center justify-center border rounded-lg border-greyscale-4 px-spacing20 py-spacing10 md:p-0"
        >
          Go Back to My Application
        </Link>
        <button
          type="button"
          disabled={!canSubmit}
          title={heldReason}
          onClick={() =>
            startTransition(async () => {
              toast("Details certified");
              await action();
              router.refresh();
            })
          }
          className={
            canSubmit
              ? "flex w-233 h-11 text-white justify-center items-center gap-spacing8 border-none px-spacing20 py-spacing10 md:px-0 md:py-spacing10 rounded-8 font-bold text-base bg-primary-main cursor-pointer"
              : "flex w-233 h-11 text-white justify-center items-center gap-spacing8 border-none px-spacing20 py-spacing10 md:px-0 md:py-spacing10 rounded-8 font-bold text-base !bg-[#DFE1E6] cursor-not-allowed"
          }
        >
          Submit
        </button>
      </div>
      {!allSigned && !rechecking && (
        <p className="text-underlineSmall text-user-title-text mt-spacing8 text-right">
          Sign every undertaking above to enable Submit.
        </p>
      )}
    </div>
  );
}
