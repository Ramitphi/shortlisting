import { IconCap, IconClock, IconWallet } from "@/components/ui";
import type { Program } from "@/lib/queries";

/**
 * The shortlisted programme, as the learner sees it — red-tinted cap, then
 * label/value rows in the site's list style. Shared by the v1 overview and
 * walk and the v2 Program tab, so the programme never renders two ways.
 */
export function ProgrammeCard({ programme }: { programme: Program }) {
  return (
    <div className="mt-4">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <IconCap className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <div className="text-[17px] font-medium leading-snug">
            {programme.name}
          </div>
          <div className="mt-0.5 text-[14px] text-body">
            {programme.institute}
          </div>
        </div>
      </div>
      <div className="mt-4 divide-y divide-line border-t border-line">
        {programme.duration && (
          <div className="flex items-center justify-between py-3 text-[14px]">
            <span className="flex items-center gap-2 text-body">
              <IconClock className="h-4 w-4 text-caption" />
              Duration
            </span>
            <span className="font-medium">{programme.duration}</span>
          </div>
        )}
        {programme.fee && (
          <div className="flex items-center justify-between py-3 text-[14px]">
            <span className="flex items-center gap-2 text-body">
              <IconWallet className="h-4 w-4 text-caption" />
              Total fee
            </span>
            <span className="font-medium">{programme.fee}</span>
          </div>
        )}
        {programme.notes && (
          <div className="py-3 text-[13.5px] text-body">{programme.notes}</div>
        )}
      </div>
    </div>
  );
}
