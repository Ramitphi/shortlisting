"use client";

import { useDbVersion } from "@/components/db-provider";
import { Shell, requireRole } from "@/components/shell";
import {
  StatTile,
  QuickAction,
  greeting,
  IconDoc,
  IconLayers,
  IconPlus,
  IconRoute,
  IconShield,
  IconSparkle,
  IconUsers,
} from "@/components/ui";
import { listApplications, listUsers } from "@/lib/queries";
import { setUserRole, createUser } from "@/lib/actions";
import { ROLE_LABELS, type Role } from "@/lib/domain";


const ROLES: Role[] = ["learner", "ac", "ops", "admin"];

export default function AdminPage() {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("admin");
  const users = listUsers();
  const apps = listApplications();

  const roleCount = (r: Role) => users.filter((u) => u.role === r).length;
  const firstName = user.name.split(" ")[0];

  return (
    <Shell
      user={user}
      title="Admin · Shortlisting"
      surface="white"
      hero={{
        title: `${greeting()}, ${firstName}`,
        subtitle: "Manage people and their roles.",
      }}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile icon={<IconUsers />} label="Total Users" value={users.length} />
        <StatTile
          icon={<IconUsers />}
          label="Academic Counsellors"
          value={roleCount("ac")}
          tone="purple"
          delay={60}
        />
        <StatTile
          icon={<IconLayers />}
          label="Ops Team"
          value={roleCount("ops")}
          tone="blue"
          delay={120}
        />
        <StatTile
          icon={<IconRoute />}
          label="Learners"
          value={roleCount("learner")}
          tone="green"
          delay={180}
        />
        <StatTile
          icon={<IconDoc />}
          label="Applications"
          value={apps.length}
          tone="pink"
          delay={240}
        />
      </div>

      <section className="mt-8">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-body">
          <IconSparkle className="h-3.5 w-3.5 text-accent" />
          Quick actions
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <QuickAction
            href="#add-user"
            icon={<IconPlus />}
            title="Add a user"
            sub="New learners get a draft application automatically"
            tone="pink"
          />
          <QuickAction
            href="#users"
            icon={<IconShield />}
            title="Assign roles"
            sub="Change anyone's access level"
            tone="purple"
            delay={60}
          />
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div id="users" className="card fade-up scroll-mt-6 lg:col-span-2" style={{ animationDelay: "180ms" }}>
          <div className="border-b border-line p-4">
            <h2 className="font-display font-semibold tracking-tight">
              Users & Role Assignment
            </h2>
            <p className="mt-0.5 text-sm text-body">
              Assign an individual the AC or Ops role (or any other) from here.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-caption">
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Current Role</th>
                <th className="px-4 py-2.5 font-medium text-right">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line/60">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-caption">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-body">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-3">
                    <form
                      action={setUserRole.bind(null, u.id)}
                      className="flex justify-end gap-2"
                    >
                      <select
                        name="role"
                        className="input !w-44 !py-1.5"
                        defaultValue={u.role}
                        disabled={u.id === user.id}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn-secondary !py-1.5"
                        disabled={u.id === user.id}
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div id="add-user" className="card fade-up h-fit scroll-mt-6 p-5" style={{ animationDelay: "240ms" }}>
          <h2 className="font-display font-semibold tracking-tight">Add User</h2>
          <p className="mb-4 mt-1 text-sm text-body">
            New learners automatically get a draft application assigned to an AC.
          </p>
          <form action={createUser} className="space-y-3">
            <div>
              <label className="label">Name</label>
              <input name="name" className="input" required />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" required />
            </div>
            <div>
              <label className="label">Role</label>
              <select name="role" className="input" defaultValue="learner">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-primary w-full">Create User</button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
