import { deleteTodo } from "@/app/actions/todos";
import { ConfirmForm } from "@/components/ConfirmForm";
import { Icon } from "@/components/icons";
import { EditTodoButton } from "@/components/TodoModal";
import { TodoToggle } from "@/components/TodoToggle";
import { formatTimeRange } from "@/lib/time";
import type { Todo } from "@/lib/types";

export function TodoRow({ todo, returnTo }: { todo: Todo; returnTo: string }) {
  const range = formatTimeRange(todo.start_time, todo.end_time);

  return (
    <div className="todo-item">
      <TodoToggle
        todoId={todo.id}
        completed={todo.completed}
        title={todo.title}
        returnTo={returnTo}
      />

      <span className="todo-title">{todo.title}</span>

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
          <EditTodoButton todo={todo} returnTo={returnTo} />

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
