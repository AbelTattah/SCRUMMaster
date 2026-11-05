import type { Metadata } from "next";
import Link from "next/link";

import {
  associateMember,
  createOrganizationAction,
  leaveOrganization,
  removeMember,
  updateProfileAction,
} from "@/app/actions/profile";
import { ChangePasswordForm, SetPasswordForm } from "@/components/account/PasswordForms";
import { AvatarForm } from "@/components/AvatarForm";
import { ConfirmForm } from "@/components/ConfirmForm";
import { requireOnboardedUser } from "@/lib/auth";
import { listMembers } from "@/lib/data/profiles";
import { avatarUrl, firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireOnboardedUser();
  const params = await searchParams;
  const tab = firstParam(params.tab) === "organization" ? "organization" : "account";

  const organization = user.organization;
  const members = organization ? await listMembers(organization.id, organization.owner_id) : [];

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <h1 className="greeting">Your account</h1>
          <p className="date-line">Account details and organization.</p>
        </div>
      </header>

      <nav className="page-tabs" aria-label="Account sections">
        <Link
          className={`page-tab${tab === "account" ? " is-active" : ""}`}
          href="/account"
          aria-current={tab === "account" ? "page" : undefined}
        >
          Account
        </Link>

        <Link
          className={`page-tab${tab === "organization" ? " is-active" : ""}`}
          href="/account?tab=organization"
          aria-current={tab === "organization" ? "page" : undefined}
        >
          Organization
        </Link>
      </nav>

      {tab === "organization" ? (
        <div className="profile-grid profile-grid--single">
          <section className="card">
            <h2 className="card-title">Organization</h2>

            {organization ? (
              <>
                <p className="card-sub">
                  <strong>{organization.name}</strong> —{" "}
                  {user.isOwner ? "organization account" : "member"}
                </p>

                <ul className="member-list">
                  {members.map((member) => (
                    <li className="member" key={member.id}>
                      <img src={avatarUrl(member.avatar_url, member.name, member.id)} alt="" />

                      <span className="member-info">
                        <span className="member-line">
                          <span className="member-name">{member.name}</span>
                          {member.is_owner ? <span className="chip chip--owner">Owner</span> : null}
                        </span>
                        <span className="member-mail">{member.email}</span>
                      </span>

                      {user.isOwner && !member.is_owner ? (
                        <ConfirmForm
                          action={removeMember}
                          className="member-remove"
                          confirmTitle="Remove member?"
                          confirmMessage={`Remove ${member.name} from ${organization.name}?`}
                          confirmLabel="Remove"
                        >
                          <input type="hidden" name="user_id" value={member.id} />
                          <button className="btn-danger btn-small" type="submit">
                            Remove
                          </button>
                        </ConfirmForm>
                      ) : null}
                    </li>
                  ))}
                </ul>

                {user.isOwner ? (
                  <>
                    <Link className="btn-primary btn-small btn-block" href="/team">
                      View team todos
                    </Link>

                    <form action={associateMember} className="inline-form add-member">
                      <label className="field">
                        <span>Add a member by email</span>
                        <input
                          className="input"
                          type="email"
                          name="email"
                          placeholder="teammate@example.com"
                          required
                        />
                      </label>

                      <button className="btn-primary btn-small" type="submit">
                        Add member
                      </button>
                    </form>
                  </>
                ) : (
                  <ConfirmForm
                    action={leaveOrganization}
                    confirmTitle="Leave organization?"
                    confirmMessage={`Leave ${organization.name}?`}
                    confirmLabel="Leave"
                  >
                    <button className="btn-ghost btn-small" type="submit">
                      Leave organization
                    </button>
                  </ConfirmForm>
                )}
              </>
            ) : (
              <>
                <p className="card-sub">You are not associated with an organization.</p>

                <form action={createOrganizationAction} className="stack-form">
                  <label className="field">
                    <span>Organization name</span>
                    <input
                      className="input"
                      type="text"
                      name="org_name"
                      placeholder="e.g. Acme Studio"
                      maxLength={80}
                      required
                    />
                  </label>

                  <button className="btn-primary btn-small" type="submit">
                    Create organization
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      ) : (
        <div className="profile-grid profile-grid--single">
          <section className="card">
            <h2 className="card-title">Account</h2>
            <p className="card-sub">
              The name and email used on your account.{" "}
              {!user.hasPassword ? <span className="chip chip--google">Google</span> : null}
            </p>

            <AvatarForm
              avatar={avatarUrl(user.profile.avatar_url, user.profile.name, user.profile.id)}
            />

            <form action={updateProfileAction} className="stack-form">
              <div className="form-row">
                <label className="field">
                  <span>Name</span>
                  <input
                    className="input"
                    type="text"
                    name="name"
                    defaultValue={user.profile.name}
                    maxLength={60}
                    required
                  />
                </label>

                <label className="field">
                  <span>Email</span>
                  <input
                    className="input"
                    type="email"
                    name="email"
                    defaultValue={user.profile.email}
                    required
                  />
                </label>
              </div>

              <button className="btn-primary btn-small" type="submit">
                Save changes
              </button>
            </form>

            <div className="card-section">
              <h2 className="card-title">Password</h2>

              {!user.hasPassword ? (
                <>
                  <p className="card-sub">
                    You signed up with Google. Add a password if you also want to sign in with
                    your email address.
                  </p>

                  <SetPasswordForm />
                </>
              ) : (
                <>
                  <p className="card-sub">
                    Use at least 8 characters — your tasks stay readable with
                    the new password.
                  </p>

                  <ChangePasswordForm />
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
