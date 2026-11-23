import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import {
  associateMember,
  createOrganizationAction,
  leaveOrganization,
  removeMember,
  updateDefinitionOfDone,
  updateProfileAction,
  updateScrumRole,
} from "@/app/actions/profile";
import { ChangePasswordForm, SetPasswordForm } from "@/components/account/PasswordForms";
import { AvatarForm } from "@/components/AvatarForm";
import { ExportDataButton } from "@/components/ExportDataButton";
import { ImportDataButton } from "@/components/ImportDataButton";
import { ConfirmForm } from "@/components/ConfirmForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser, requireOnboardedUser } from "@/lib/auth";
import { listMembers } from "@/lib/data/profiles";
import { avatarUrl, firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentUser();
  const isGuest = !current && (await cookies()).get("scrum-guest")?.value === "1";

  if (isGuest) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-heading">
            <h1 className="greeting">Guest mode</h1>
            <p className="date-line">Your data is stored locally on this device.</p>
          </div>
        </header>

        <section className="panel">
          <h2 className="card-title">Export your data</h2>
          <p className="hint-text" style={{ marginBottom: 12 }}>
            Download your local tasks as JSON, or import a previous export to restore them on this device.
          </p>
          <ExportDataButton />
          <div className="export-import-divider" />
          <ImportDataButton />
        </section>

        <section className="panel" style={{ marginTop: 16 }}>
          <h2 className="card-title">Want to sync across devices?</h2>
          <p className="hint-text" style={{ marginBottom: 16 }}>
            Sign in to sync tasks, join teams, generate reports, and access all features.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn-add" href="/login">Sign in</Link>
            <Link className="btn-small" href="/register">Create account</Link>
          </div>
        </section>
      </div>
    );
  }

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
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              {organization ? (
                <CardDescription>
                  <strong>{organization.name}</strong> —{" "}
                  {user.isOwner ? "organization account" : "member"}
                </CardDescription>
              ) : null}
            </CardHeader>

            <CardContent className="space-y-6">
              {organization ? (
                <>
                  <ul className="member-list">
                    {members.map((member) => (
                      <li className="member" key={member.id}>
                        <img
                          src={avatarUrl(member.avatar_url, member.name, member.id)}
                          alt=""
                        />

                        <span className="member-info">
                          <span className="member-line">
                            <span className="member-name">{member.name}</span>
                            {member.is_owner ? (
                              <span className="chip chip--owner">Owner</span>
                            ) : member.scrum_role ? (
                              <span className="chip chip--role">
                                {member.scrum_role === "product_owner"
                                  ? "Product Owner"
                                  : member.scrum_role === "scrum_master"
                                    ? "Scrum Master"
                                    : "Developer"}
                              </span>
                            ) : null}
                          </span>
                          <span className="member-mail">{member.email}</span>
                        </span>

                        {user.isOwner ? (
                          <div className="member-actions">
                            <form action={updateScrumRole} className="member-role">
                              <input type="hidden" name="user_id" value={member.id} />
                              <select
                                name="scrum_role"
                                defaultValue={member.scrum_role ?? ""}
                                aria-label={`Scrum role for ${member.name}`}
                              >
                                <option value="">No role</option>
                                <option value="product_owner">Product Owner</option>
                                <option value="scrum_master">Scrum Master</option>
                                <option value="developer">Developer</option>
                              </select>
                              <Button type="submit" variant="outline" size="sm">
                                Set
                              </Button>
                            </form>

                            {!member.is_owner ? (
                              <ConfirmForm
                                action={removeMember}
                                className="member-remove"
                                confirmTitle="Remove member?"
                                confirmMessage={`Remove ${member.name} from ${organization.name}?`}
                                confirmLabel="Remove"
                              >
                                <input type="hidden" name="user_id" value={member.id} />
                                <Button type="submit" variant="destructive" size="sm">
                                  Remove
                                </Button>
                              </ConfirmForm>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  {user.isOwner ? (
                    <div className="space-y-4">
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href="/team">
                          View team todos
                        </Link>
                      </Button>

                      <form action={associateMember} className="inline-form add-member">
                        <Label className="field w-full">
                          <span>Add a member by email</span>
                          <Input
                            type="email"
                            name="email"
                            placeholder="teammate@example.com"
                            required
                          />
                        </Label>

                        <Button type="submit" size="sm">
                          Add member
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <ConfirmForm
                      action={leaveOrganization}
                      confirmTitle="Leave organization?"
                      confirmMessage={`Leave ${organization.name}?`}
                      confirmLabel="Leave"
                    >
                      <Button type="submit" variant="outline" size="sm">
                        Leave organization
                      </Button>
                    </ConfirmForm>
                  )}
                </>
              ) : (
                <>
                  <p className="card-sub mb-4">
                    You are not associated with an organization.
                  </p>

                  <form action={createOrganizationAction} className="stack-form">
                    <Label className="field w-full">
                      <span>Organization name</span>
                      <Input
                        type="text"
                        name="org_name"
                        placeholder="e.g. Acme Studio"
                        maxLength={80}
                        required
                      />
                    </Label>

                    <Button type="submit" size="sm">
                      Create organization
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>

          {organization && user.isOwner ? (
            <Card className="dod-card">
              <CardHeader>
                <CardTitle>Definition of Done</CardTitle>
                <CardDescription>
                  The shared checklist that says what &ldquo;done&rdquo; means for
                  this team. One item per line.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={updateDefinitionOfDone} className="stack-form">
                  <Label className="field w-full">
                    <span>Checklist</span>
                    <textarea
                      className="input"
                      name="definition_of_done"
                      rows={6}
                      defaultValue={organization.definition_of_done ?? ""}
                      placeholder={
                        "Tests pass\nReviewed by a teammate\nDocs updated\nDeployed to production"
                      }
                    />
                  </Label>

                  <Button type="submit" size="sm">
                    Save checklist
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        <div className="profile-grid profile-grid--single">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                The name and email used on your account.{" "}
                {!user.hasPassword ? (
                  <span className="chip chip--google">Google</span>
                ) : null}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <AvatarForm
                avatar={avatarUrl(
                  user.profile.avatar_url,
                  user.profile.name,
                  user.profile.id,
                )}
              />

              <form action={updateProfileAction} className="stack-form">
                <div className="form-row">
                  <Label className="field">
                    <span>Name</span>
                    <Input
                      type="text"
                      name="name"
                      defaultValue={user.profile.name}
                      maxLength={60}
                      required
                    />
                  </Label>

                  <Label className="field">
                    <span>Email</span>
                    <Input
                      type="email"
                      name="email"
                      defaultValue={user.profile.email}
                      required
                    />
                  </Label>
                </div>

                <Button type="submit" size="sm">
                  Save changes
                </Button>
              </form>

              <div className="card-section">
                <h2 className="card-title">Password</h2>

                {!user.hasPassword ? (
                  <>
                    <p className="card-sub">
                      You signed up with Google. Add a password if you also want to
                      sign in with your email address.
                    </p>

                    <SetPasswordForm />
                  </>
                ) : (
                  <>
                    <p className="card-sub">
                      Use at least 8 characters — your tasks stay readable with the
                      new password.
                    </p>

                    <ChangePasswordForm />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data export</CardTitle>
              <CardDescription>
                Download all your tasks (titles and blockers decrypted locally) as
                a JSON file, or import a previous export to restore your tasks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExportDataButton />
              <div className="export-import-divider" />
              <ImportDataButton />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
