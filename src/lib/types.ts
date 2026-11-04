export type PageFilter = "home" | "completed" | "in-progress";

export type NotificationKind =
  | "overdue"
  | "blocker"
  | "reminder"
  | "report"
  | "upcoming";

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  organization_id: string | null;
  notify_browser: boolean;
  notify_email: boolean;
  notify_lead_minutes: number;
  onboarding_complete: boolean;
  xp: number;
  streak: number;
  best_streak: number;
  last_report_date: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  start_time: string | null;
  end_time: string | null;
  assignee_id: string | null;
  blocker: string | null;
  legacy_id: number | null;
  created_at: string;
}

export interface TeamTodo extends Todo {
  owner_name: string;
  owner_avatar: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  is_owner: boolean;
  todo_count: number;
  completed_count: number;
  xp: number;
  streak: number;
  last_report_date: string | null;
}

export interface Assignee {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface Counts {
  completed: number;
  in_progress: number;
}

/** One "yesterday / today / blockers" entry for a calendar day. */
export interface DailyReport {
  id: string;
  user_id: string;
  /** YYYY-MM-DD in the application timezone. */
  report_date: string;
  yesterday: string;
  today: string;
  blockers: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  key: string;
  kind: NotificationKind;
  /** Empty for items that are not tied to a single task (daily report). */
  todo_id: string;
  title: string;
  detail: string;
  start_time: string | null;
  end_time: string | null;
  sort: number;
  read: boolean;
  emailed: boolean;
}

export interface OrganizationMembership {
  organization: Organization;
  isOwner: boolean;
}

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile;
  organization: Organization | null;
  isOwner: boolean;
  hasPassword: boolean;
}
