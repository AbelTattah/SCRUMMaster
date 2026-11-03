import { Icon } from "@/components/icons";
import { formatTimeRange } from "@/lib/time";
import type { TeamTodo } from "@/lib/types";
import { avatarUrl } from "@/lib/utils";

export function TeamRow({ todo }: { todo: TeamTodo }) {
  const range = formatTimeRange(todo.start_time, todo.end_time);

  return (
    <div className="todo-item team-row">
      <input
        type="checkbox"
        className="todo-check"
        defaultChecked={todo.completed}
        disabled
        aria-label={`${todo.completed ? "Completed" : "In progress"}: ${todo.title}`}
      />

      <span className="todo-title">{todo.title}</span>

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
    </div>
  );
}
