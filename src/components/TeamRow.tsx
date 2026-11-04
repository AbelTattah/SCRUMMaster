import { deleteTodo } from "@/app/actions/todos";
import { BlockerButton } from "@/components/BlockerModal";
import { ConfirmForm } from "@/components/ConfirmForm";
import { Icon } from "@/components/icons";
import { EditTodoButton } from "@/components/TodoModal";
import { TodoToggle } from "@/components/TodoToggle";
import { formatTimeRange } from "@/lib/time";
import type { TeamTodo } from "@/lib/types";
import { avatarUrl } from "@/lib/utils";

/**
 * One task on the organization's team screen. The owner can act on it here —
 * tick it off, edit it, record a blocker or delete it — even when the person
 * it belongs to has not signed in yet.
 */
export function TeamRow({ todo, returnTo }: { todo: TeamTodo; returnTo: string }) {
  const range = formatTimeRange(todo.start_time, todo.end_time);

  return (
    <div className="todo-item team-row">
      <TodoToggle
        todoId={todo.id}
        completed={todo.completed}
        title={todo.title}
        returnTo={returnTo}
      />

      <span className="todo-title">{todo.title}</span>

      <span className="todo-tags">
        {todo.assignee_name && todo.assignee_name !== todo.owner_name ? (
          <span
            className="chip chip--assignee"
            title={`Assigned to ${todo.assignee_name}`}
          >
            <img src={avatarUrl(todo.assignee_avatar)} alt="" />
            <span>{todo.assignee_name}</span>
          </span>
        ) : null}

        {todo.blocker ? (
          <span className="todo-blocker" title={todo.blocker}>
            Blocked
          </span>
        ) : null}
      </span>

      <span className="todo-meta">
        <span className="todo-owner">
          <img src={avatarUrl(todo.owner_avatar)} alt="" />
          {todo.owner_name}
        </span>

        {range ? (
          <span className="todo-time">
            <Icon name="clock" />
            <span>{range}</span>
          </span>
        ) : null}
      </span>

      <details className="kebab">
        <summary aria-label="Task actions">
          <Icon name="kebab" fill="currentColor" />
        </summary>

        <div className="kebab-menu">
          <EditTodoButton todo={todo} returnTo={returnTo} />

          {todo.completed ? null : (
            <BlockerButton todo={todo} returnTo={returnTo} />
          )}

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
        </div>
      </details>
    </div>
  );
}
