import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ask } from "@tauri-apps/plugin-dialog";
import type { CareTask, CreateCareTaskInput, UpdateCareTaskInput } from "../types";
import { formatCareDate, formatCareTimestamp, getCareTaskDueStatus, isValidCareDate, normalizeCareTaskInput } from "../lib/careTasks";
import { todayIso } from "../lib/stats";

interface CareTasksPanelProps {
  dogId: number;
  dogName: string;
  tasks: CareTask[];
  onCreate: (input: CreateCareTaskInput) => Promise<void>;
  onUpdate: (input: UpdateCareTaskInput) => Promise<void>;
  onComplete: (id: number, dogId: number) => Promise<void>;
  onReopen: (id: number, dogId: number) => Promise<void>;
  onDelete: (id: number, dogId: number) => Promise<void>;
}

interface CareFormValues {
  name: string;
  due_date: string;
  notes: string;
  repeat_days: string;
}

const inputClass = "mt-1 w-full min-w-0 rounded-lg border border-[var(--color-trail)]/50 bg-[var(--color-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]";
const actionClass = "rounded-lg px-3 py-1.5 text-sm text-[var(--color-moss)] hover:bg-[var(--color-mist)] disabled:opacity-60";

function emptyForm(): CareFormValues {
  return { name: "", due_date: todayIso(), notes: "", repeat_days: "" };
}

function useLocalToday() {
  const [today, setToday] = useState(todayIso);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      setToday(todayIso());
      clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      timer = setTimeout(update, midnight.getTime() - now.getTime() + 100);
    };
    update();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return today;
}

/** A keyed inner panel discards drafts and pending UI state when switching dogs. */
export function CareTasksPanel(props: CareTasksPanelProps) {
  return <DogCareTasks key={props.dogId} {...props} />;
}

function DogCareTasks({ dogId, dogName, tasks, onCreate, onUpdate, onComplete, onReopen, onDelete }: CareTasksPanelProps) {
  const today = useLocalToday();
  const formId = useId();
  const [editing, setEditing] = useState<CareTask | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CareFormValues>({
    defaultValues: emptyForm(),
  });

  const active = tasks.filter((task) => task.dog_id === dogId && task.completed_at == null)
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || a.id - b.id);
  const done = tasks.filter((task) => task.dog_id === dogId && task.completed_at != null)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "") || b.id - a.id);
  const overdue = active.filter((task) => task.due_date < today).length;
  const dueToday = active.filter((task) => task.due_date === today).length;

  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await action();
    } catch (err) {
      setError(`Could not update care tasks: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    reset(emptyForm());
  };

  const submit = handleSubmit((values) => run(async () => {
    const input = normalizeCareTaskInput({
      dog_id: dogId,
      name: values.name,
      due_date: values.due_date,
      notes: values.notes,
      repeat_days: values.repeat_days.trim() ? Number(values.repeat_days) : null,
    });
    if (editing) {
      await onUpdate({ ...input, id: editing.id });
      setStatus("Care task updated");
    } else {
      await onCreate(input);
      setStatus("Care task added");
    }
    cancelEdit();
  }));

  const editTask = (task: CareTask) => {
    setEditing(task);
    setError(null);
    setStatus(null);
    reset({ name: task.name, due_date: task.due_date, notes: task.notes ?? "", repeat_days: task.repeat_days == null ? "" : String(task.repeat_days) });
  };

  const deleteTask = (task: CareTask) => run(async () => {
    const confirmed = await ask(`Permanently delete “${task.name}” for ${dogName}?`, {
      title: "Delete care task", kind: "warning", okLabel: "Delete task", cancelLabel: "Cancel",
    });
    if (!confirmed) return;
    await onDelete(task.id, dogId);
    if (editing?.id === task.id) cancelEdit();
    setStatus("Care task deleted");
  });

  const renderTask = (task: CareTask) => {
    const completed = task.completed_at != null;
    const dueStatus = getCareTaskDueStatus(task.due_date, today);
    const label = dueStatus === "overdue" ? `Overdue · ${formatCareDate(task.due_date)}`
      : dueStatus === "today" ? "Due today" : `Due ${formatCareDate(task.due_date)}`;
    return (
      <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0 flex-1 basis-48 space-y-1">
          <p className="break-words font-medium text-[var(--color-soil)]">{task.name}</p>
          <p className={`text-sm ${!completed && dueStatus === "overdue" ? "text-[var(--color-danger)]" : "text-[var(--color-moss)]"}`}>
            {task.completed_at != null ? `Done ${formatCareTimestamp(task.completed_at)}` : label}
          </p>
          {task.repeat_days != null && <p className="text-sm text-[var(--color-bark)]/80">Repeats every {task.repeat_days} {task.repeat_days === 1 ? "day" : "days"}</p>}
          {!completed && task.last_completed_at && <p className="text-sm text-[var(--color-bark)]/80">Last done {formatCareTimestamp(task.last_completed_at)}</p>}
          {task.notes && <p className="whitespace-pre-wrap break-words text-sm text-[var(--color-bark)]/80">{task.notes}</p>}
        </div>
        <div className="flex flex-wrap gap-1">
          <button type="button" disabled={busy} aria-label={`${completed ? "Reopen" : "Mark done"}: ${task.name}`} className={actionClass}
            onClick={() => void run(async () => {
              if (completed) await onReopen(task.id, dogId);
              else await onComplete(task.id, dogId);
              if (editing?.id === task.id) cancelEdit();
              setStatus(completed ? "Care task reopened" : task.repeat_days == null ? "Care task marked done" : "Care task completed and next due date scheduled");
            })}>
            {completed ? "Reopen" : "Mark done"}
          </button>
          {!completed && <button type="button" disabled={busy} aria-label={`Edit: ${task.name}`} className={actionClass} onClick={() => editTask(task)}>Edit</button>}
          <button type="button" disabled={busy} aria-label={`Delete: ${task.name}`} className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:opacity-60" onClick={() => void deleteTask(task)}>Delete</button>
        </div>
      </li>
    );
  };

  return (
    <section aria-label={`Care tasks for ${dogName}`} className="care-tasks-panel rounded-2xl bg-[var(--color-panel)] p-4 shadow-sm ring-1 ring-[var(--color-trail)]/40 sm:p-5">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-medium text-[var(--color-soil)]">Care tasks</h2>
        <p className="text-sm text-[var(--color-bark)]/80">Upcoming care for {dogName}. {overdue} overdue · {dueToday} due today.</p>
      </div>
      {error && <p role="alert" className="mb-3 break-words text-sm text-[var(--color-danger)]">{error}</p>}
      {status && <p role="status" className="mb-3 text-sm text-[var(--color-moss)]">{status}</p>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {active.length ? <ul aria-label="Upcoming care tasks" className="divide-y divide-[var(--color-trail)]/30">{active.map(renderTask)}</ul>
            : <div className="rounded-xl bg-[var(--color-mist)]/60 px-4 py-6 text-center">
                <p className="font-medium text-[var(--color-soil)]">{done.length ? "All care tasks are done" : "Plan a little care"}</p>
                <p className="mt-1 text-sm text-[var(--color-bark)]/80">Add a bath, nail trim, tooth brushing, or another task for {dogName}.</p>
              </div>}
          {done.length > 0 && <details className="mt-3">
            <summary className="cursor-pointer rounded-lg py-2 text-sm font-medium text-[var(--color-moss)]">Done ({done.length})</summary>
            <ul aria-label="Completed care tasks" className="divide-y divide-[var(--color-trail)]/30">{done.map(renderTask)}</ul>
          </details>}
        </div>
        <form onSubmit={submit} className="min-w-0 space-y-3 rounded-xl bg-[var(--color-mist)]/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-[var(--color-soil)]">{editing ? "Edit care task" : "Add care task"}</h3>
            {editing && <button type="button" disabled={busy} className={actionClass} onClick={cancelEdit}>Cancel</button>}
          </div>
          <fieldset disabled={busy} className="min-w-0 space-y-3 disabled:opacity-60">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Task suggestions">
              {["Give bath", "Trim Nails", "Brush Teeth"].map((name) => <button key={name} type="button" className="rounded-lg bg-[var(--color-input)] px-2.5 py-1.5 text-xs text-[var(--color-moss)] ring-1 ring-[var(--color-trail)]/40" onClick={() => setValue("name", name, { shouldValidate: true })}>{name}</button>)}
            </div>
            <div className="text-sm">
              <label htmlFor={`${formId}-name`}>Task name</label>
              <input id={`${formId}-name`} aria-describedby={errors.name ? `${formId}-name-error` : undefined} className={inputClass} placeholder="What needs doing?" aria-invalid={!!errors.name} {...register("name", { validate: (value) => !!value.trim() || "Task name is required" })} />
              {errors.name && <span id={`${formId}-name-error`} role="alert" className="mt-1 block text-xs text-[var(--color-danger)]">{errors.name.message}</span>}
            </div>
            <div className="text-sm">
              <label htmlFor={`${formId}-date`}>Due date</label>
              <input id={`${formId}-date`} aria-describedby={errors.due_date ? `${formId}-date-error` : undefined} type="date" className={inputClass} aria-invalid={!!errors.due_date} {...register("due_date", { validate: (value) => isValidCareDate(value) || "A valid due date is required" })} />
              {errors.due_date && <span id={`${formId}-date-error`} role="alert" className="mt-1 block text-xs text-[var(--color-danger)]">{errors.due_date.message}</span>}
            </div>
            <div className="text-sm">
              <label htmlFor={`${formId}-repeat`}>Repeat every (days)</label>
              <input id={`${formId}-repeat`} aria-describedby={`${formId}-repeat-help${errors.repeat_days ? ` ${formId}-repeat-error` : ""}`} type="number" min={1} step={1} placeholder="Optional" className={inputClass} aria-invalid={!!errors.repeat_days} {...register("repeat_days", { validate: (value) => !value.trim() || (Number.isSafeInteger(Number(value)) && Number(value) > 0) || "Repeat interval must be a positive whole number" })} />
              {errors.repeat_days && <span id={`${formId}-repeat-error`} role="alert" className="mt-1 block text-xs text-[var(--color-danger)]">{errors.repeat_days.message}</span>}
              <span id={`${formId}-repeat-help`} className="mt-1 block text-xs text-[var(--color-bark)]/80">Leave blank for a one-time task. Repeats start from the day you mark it done.</span>
            </div>
            <label className="block text-sm">Notes
              <textarea rows={2} placeholder="Optional" className={inputClass} {...register("notes")} />
            </label>
            <button type="submit" className="w-full rounded-lg bg-[var(--color-moss)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-leaf)]">{busy ? "Saving…" : editing ? "Save task changes" : "Add task"}</button>
          </fieldset>
        </form>
      </div>
    </section>
  );
}
