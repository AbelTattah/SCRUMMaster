import { deleteTodo } from "@/app/actions/todos";
import { BlockerButton } from "@/components/BlockerModal";
import { ConfirmForm } from "@/components/ConfirmForm";
import { Icon } from "@/components/icons";
import { EditTodoButton } from "@/components/TodoModal";
import { TodoToggle } from "@/components/TodoToggle";
import { formatTimeRange } from "@/lib/time";
import type { Assignee, Todo } from "@/lib/types";
import { avatarUrl } from "@/lib/utils";

export function TodoRow({
  todo,
  returnTo,
  currentUserId,
  assignees = [],
}: {
  todo: Todo;
  returnTo: string;
  currentUserId: string;
  assignees?: Assignee[];
}) {
  const range = formatTimeRange(todo.start_time, todo.end_time);
  const canManage = todo.user_id === currentUserId;
  const assignee = todo.assignee_id
    ? (assignees.find((member) => member.id === todo.assignee_id) ?? null)
    : null;
  const assigneeLabel = assignee
    ? assignee.id === currentUserId
      ? "You"
      : assignee.name
    : null;

  return (
    <div className="todo-item">
      <TodoToggle
        todoId={todo.id}
        completed={todo.completed}
        title={todo.title}
        returnTo={returnTo}
      />

      <span className="todo-title">{todo.title}</span>

      <span className="todo-tags">
        {assignee && assigneeLabel ? (
          <span
            className="chip chip--assignee"
            title={assignee.id === currentUserId ? "Assigned to you" : `Assigned to ${assignee.name}`}
          >
            <img src={avatarUrl(assignee.avatar_url)} alt="" />
            <span>{assigneeLabel}</span>
          </span>
        ) : null}

        {todo.blocker ? (
          <span className="todo-blocker" title={todo.blocker}>
            Blocked
          </span>
        ) : null}
      </span>

      <span className="todo-time">
        {range ? (
          <>
            <Icon name="clock" />
            <span>{range}</span>
          </>
        ) : null}
      </span>

      <details className="kebab">
        <summary aria-label="Todo actions">
          <Icon name="kebab" fill="currentColor" />
        </summary>

        <div className="kebab-menu">
          {canManage ? <EditTodoButton todo={todo} returnTo={returnTo} /> : null}

          {todo.completed ? null : (
            <BlockerButton todo={todo} returnTo={returnTo} />
          )}

          {canManage ? (
            <ConfirmForm
              action={deleteTodo}
              confirmTitle="Delete task?"
              confirmMessage={`Delete “${todo.title}”? This cannot be undone.`}
              confirmLabel="Delete"
            >
              <input type="hidden" name="id" value={todo.id} />
              <input type="hidden" name="return_to" value={returnTo} />
              <button type="submit" className="danger">
                Delete
              </button>
            </ConfirmForm>
          ) : null}
        </div>
      </details>
    </div>
  );
}
