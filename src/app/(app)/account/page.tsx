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
import { ExportDataButton } from "@/components/ExportDataButton";
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
                            ) : null}
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
                            <Button type="submit" variant="destructive" size="sm">
                              Remove
                            </Button>
                          </ConfirmForm>
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
                a JSON file. Your data, your copy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExportDataButton />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
