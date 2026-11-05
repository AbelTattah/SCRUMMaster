/**
 * Client-side notification display: turns the server's structured items
 * (ciphertext titles/blockers + static detail text) into the strings the UI
 * and OS alerts show. The server can no longer read task content, so this
 * composition happens here, after decryption.
 */
import { decryptText } from "@/lib/sync";
import type { NotificationKind } from "@/lib/types";

export interface NotificationDisplay {
  key: string;
  kind: NotificationKind;
  todo_id: string;
  title: string;
  detail: string;
  start_time: string | null;
  end_time: string | null;
  read: boolean;
}

/** The shape both the server items and the polled feed provide. */
export interface DecoratableItem {
  key: string;
  kind: NotificationKind;
  todo_id: string;
  title: string;
  detail: string;
  blocker?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  read?: boolean;
}

export async function decorateNotification(item: DecoratableItem): Promise<NotificationDisplay> {
  const title = await decryptText(item.title);
  const detail =
    item.kind === "blocker" && item.blocker
      ? `Blocked — ${await decryptText(item.blocker)}`
      : item.detail;

  return {
    key: item.key,
    kind: item.kind,
    todo_id: item.todo_id,
    title,
    detail,
    start_time: item.start_time ?? null,
    end_time: item.end_time ?? null,
    read: item.read ?? false,
  };
}

export async function decorateAll(
  items: DecoratableItem[],
): Promise<NotificationDisplay[]> {
  const out: NotificationDisplay[] = [];

  for (const item of items) {
    out.push(await decorateNotification(item));
  }

  return out;
}
