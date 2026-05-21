import {
  BadgeDollarSign,
  Ban,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FolderKanban,
  Gauge,
  ListChecks,
  Megaphone,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ServerCog,
  SlidersHorizontal,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { OriginButton } from "./components/OriginButton";
import { StatusBadge } from "./components/StatusBadge";
import {
  addDays,
  addMonths,
  alertLabel,
  diffInDays,
  endOfMonth,
  endOfWeek,
  formatLongDate,
  formatMonthTitle,
  formatShortDate,
  getWeekDays,
  isSameMonth,
  isWithinInclusive,
  monthGrid,
  monthKey,
  nextDateForRecurrence,
  startOfMonth,
  startOfWeek,
  todayKey,
} from "./lib/dates";
import { loadData, saveData } from "./lib/storage";
import type {
  AppData,
  AppView,
  CalendarCategory,
  CalendarEvent,
  CalendarMode,
  CalendarStatus,
  ContentItem,
  ContentPlatform,
  ContentStatus,
  ContentType,
  FinanceItem,
  FinanceStatus,
  GeneralTask,
  MaintenanceItem,
  MaintenanceType,
  Platform,
  Priority,
  Project,
  ProjectStatus,
  Recurrence,
  Reminder,
  ReminderStatus,
  ReminderType,
  TaskCategory,
  TaskStatus,
} from "./types";
import {
  calendarCategoryOptions,
  calendarStatusOptions,
  contentPlatformOptions,
  contentStatusOptions,
  contentTypeOptions,
  financeStatusOptions,
  maintenanceTypeOptions,
  platformOptions,
  priorityOptions,
  projectStatusOptions,
  recurrenceOptions,
  reminderStatusOptions,
  reminderTypeOptions,
  taskCategoryOptions,
  taskStatusOptions,
} from "./types";

const weekLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const alertOffsets = new Set([0, 1, 7, 15, 30]);

const emptyFilters = {
  projectId: "todos",
  category: "todos",
  status: "todos",
  priority: "todos",
  date: "",
  platform: "todos",
  recurrence: "todos",
};

const emptyProject = {
  name: "",
  siteUrl: "",
  description: "",
  platform: "Vercel" as Platform,
  status: "ativo" as ProjectStatus,
  notes: "",
  adminUrl: "",
};

const emptyReminder = {
  title: "",
  projectId: "",
  dueDate: todayKey(),
  type: "renovação" as ReminderType,
  recurrence: "único" as Recurrence,
  priority: "média" as Priority,
  status: "pendente" as ReminderStatus,
  notes: "",
  originUrl: "",
  recurrenceStopped: false,
};

const emptyContent = {
  title: "",
  projectId: "",
  platform: "Instagram" as ContentPlatform,
  type: "post comum" as ContentType,
  status: "ideia" as ContentStatus,
  postDate: todayKey(),
  priority: "média" as Priority,
  caption: "",
  assetUrl: "",
  notes: "",
  recurrence: "único" as Recurrence,
  recurrenceStopped: false,
};

const emptyMaintenance = {
  title: "",
  projectId: "",
  kind: "Atualizar projeto" as MaintenanceType,
  date: todayKey(),
  recurrence: "único" as Recurrence,
  priority: "média" as Priority,
  status: "pendente" as TaskStatus,
  originUrl: "",
  notes: "",
  recurrenceStopped: false,
};

const emptyFinanceItem = {
  name: "",
  projectId: "",
  amountBrl: 0,
  amountUsd: 0,
  dueDate: todayKey(),
  recurrence: "mensal" as Recurrence,
  status: "pendente" as FinanceStatus,
  originUrl: "",
  notes: "",
  recurrenceStopped: false,
};

const emptyTask = {
  title: "",
  projectId: "",
  category: "operação" as TaskCategory,
  date: todayKey(),
  priority: "média" as Priority,
  status: "pendente" as TaskStatus,
  recurrence: "único" as Recurrence,
  originUrl: "",
  notes: "",
  recurrenceStopped: false,
};

const quickKindOptions = ["conteúdo", "manutenção", "financeiro", "renovação", "tarefa"] as const;

type CalendarFilters = typeof emptyFilters;
type QuickKind = (typeof quickKindOptions)[number];
type ProjectDraft = typeof emptyProject;
type ReminderDraft = typeof emptyReminder;
type ContentDraft = typeof emptyContent;
type MaintenanceDraft = typeof emptyMaintenance;
type FinanceDraft = typeof emptyFinanceItem;
type TaskDraft = typeof emptyTask;

export function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [activeView, setActiveView] = useState<AppView>("calendário");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("mês");
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [filters, setFilters] = useState<CalendarFilters>(emptyFilters);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    saveData(data);
  }, [data]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const projectNameById = useMemo(() => new Map(data.projects.map((project) => [project.id, project.name])), [data.projects]);

  const calendarEvents = useMemo(() => buildCalendarEvents(data, projectNameById), [data, projectNameById]);
  const filteredEvents = useMemo(() => applyCalendarFilters(calendarEvents, filters), [calendarEvents, filters]);
  const financeStats = useMemo(() => buildFinanceStats(data.financeItems, data.projects), [data.financeItems, data.projects]);

  const summary = useMemo(() => {
    const today = todayKey();
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const pending = filteredEvents.filter((event) => !isEventDone(event));

    return {
      today: pending.filter((event) => event.date === today || isAlwaysVisible(event)).length,
      week: pending.filter((event) => isAlwaysVisible(event) || isWithinInclusive(event.date, weekStart, weekEnd)).length,
      month: pending.filter((event) => isAlwaysVisible(event) || isWithinInclusive(event.date, monthStart, monthEnd)).length,
      late: pending.filter((event) => event.status === "atrasado").length,
    };
  }, [filteredEvents]);

  const automaticAlerts = useMemo(() => {
    return filteredEvents
      .filter((event) => {
        if (isEventDone(event) || isAlwaysVisible(event)) return false;
        const days = diffInDays(event.date);
        return days < 0 || alertOffsets.has(days);
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 14);
  }, [filteredEvents]);

  function showMissingOrigin(message?: string) {
    setToast(message ?? "Nenhum link de origem cadastrado para este item.");
  }

  function upsertProject(project: Project) {
    setData((current) => ({
      ...current,
      projects: current.projects.some((item) => item.id === project.id)
        ? current.projects.map((item) => (item.id === project.id ? project : item))
        : [project, ...current.projects],
    }));
  }

  function deleteProject(projectId: string) {
    const now = new Date().toISOString();
    setData((current) => ({
      ...current,
      projects: current.projects.filter((project) => project.id !== projectId),
      reminders: current.reminders.map((item) => (item.projectId === projectId ? { ...item, projectId: "", updatedAt: now } : item)),
      contentItems: current.contentItems.map((item) =>
        item.projectId === projectId ? { ...item, projectId: "", updatedAt: now } : item,
      ),
      maintenanceItems: current.maintenanceItems.map((item) =>
        item.projectId === projectId ? { ...item, projectId: "", updatedAt: now } : item,
      ),
      financeItems: current.financeItems.map((item) => (item.projectId === projectId ? { ...item, projectId: "", updatedAt: now } : item)),
      generalTasks: current.generalTasks.map((item) => (item.projectId === projectId ? { ...item, projectId: "", updatedAt: now } : item)),
    }));
  }

  function upsertReminder(reminder: Reminder) {
    setData((current) => ({
      ...current,
      reminders: current.reminders.some((item) => item.id === reminder.id)
        ? current.reminders.map((item) => (item.id === reminder.id ? reminder : item))
        : [reminder, ...current.reminders],
    }));
  }

  function deleteReminder(reminderId: string) {
    setData((current) => ({ ...current, reminders: current.reminders.filter((item) => item.id !== reminderId) }));
  }

  function upsertContent(item: ContentItem) {
    setData((current) => ({
      ...current,
      contentItems: current.contentItems.some((content) => content.id === item.id)
        ? current.contentItems.map((content) => (content.id === item.id ? item : content))
        : [item, ...current.contentItems],
    }));
  }

  function deleteContent(itemId: string) {
    setData((current) => ({ ...current, contentItems: current.contentItems.filter((item) => item.id !== itemId) }));
  }

  function upsertMaintenance(item: MaintenanceItem) {
    setData((current) => ({
      ...current,
      maintenanceItems: current.maintenanceItems.some((maintenance) => maintenance.id === item.id)
        ? current.maintenanceItems.map((maintenance) => (maintenance.id === item.id ? item : maintenance))
        : [item, ...current.maintenanceItems],
    }));
  }

  function deleteMaintenance(itemId: string) {
    setData((current) => ({ ...current, maintenanceItems: current.maintenanceItems.filter((item) => item.id !== itemId) }));
  }

  function upsertFinanceItem(item: FinanceItem) {
    setData((current) => ({
      ...current,
      financeItems: current.financeItems.some((financeItem) => financeItem.id === item.id)
        ? current.financeItems.map((financeItem) => (financeItem.id === item.id ? item : financeItem))
        : [item, ...current.financeItems],
    }));
  }

  function deleteFinanceItem(itemId: string) {
    setData((current) => ({ ...current, financeItems: current.financeItems.filter((item) => item.id !== itemId) }));
  }

  function upsertTask(task: GeneralTask) {
    setData((current) => ({
      ...current,
      generalTasks: current.generalTasks.some((item) => item.id === task.id)
        ? current.generalTasks.map((item) => (item.id === task.id ? task : item))
        : [task, ...current.generalTasks],
    }));
  }

  function deleteTask(taskId: string) {
    setData((current) => ({ ...current, generalTasks: current.generalTasks.filter((item) => item.id !== taskId) }));
  }

  function completeReminder(reminderId: string) {
    setData((current) => {
      const reminder = current.reminders.find((item) => item.id === reminderId);
      if (!reminder || reminder.status === "concluído") return current;

      const now = new Date().toISOString();
      const nextDate = shouldCreateNext(reminder.recurrence, reminder.recurrenceStopped)
        ? nextDateForRecurrence(reminder.dueDate, reminder.recurrence)
        : null;
      const completedReminder: Reminder = { ...reminder, status: "concluído", completedAt: now, updatedAt: now };
      const nextReminder: Reminder | null = nextDate
        ? {
            ...reminder,
            id: createId("reminder"),
            dueDate: nextDate,
            status: "pendente",
            sourceId: reminder.sourceId ?? reminder.id,
            createdAt: now,
            updatedAt: now,
            completedAt: undefined,
          }
        : null;
      const shouldAppendNext =
        nextReminder && !hasDuplicateReminderOccurrence(current.reminders, reminder, nextReminder.dueDate) ? nextReminder : null;

      return {
        ...current,
        reminders: [
          ...current.reminders.map((item) => (item.id === reminderId ? completedReminder : item)),
          ...(shouldAppendNext ? [shouldAppendNext] : []),
        ],
      };
    });
  }

  function ignoreReminder(reminderId: string) {
    setData((current) => ({
      ...current,
      reminders: current.reminders.map((item) =>
        item.id === reminderId ? { ...item, status: "ignorado", updatedAt: new Date().toISOString() } : item,
      ),
    }));
  }

  function publishContent(itemId: string) {
    setData((current) => {
      const content = current.contentItems.find((item) => item.id === itemId);
      if (!content || content.status === "publicado") return current;

      const now = new Date().toISOString();
      const nextDate = shouldCreateNext(content.recurrence, content.recurrenceStopped)
        ? nextDateForRecurrence(content.postDate, content.recurrence)
        : null;
      const published: ContentItem = { ...content, status: "publicado", publishedAt: now, updatedAt: now };
      const nextContent: ContentItem | null = nextDate
        ? {
            ...content,
            id: createId("content"),
            postDate: nextDate,
            status: "ideia",
            sourceId: content.sourceId ?? content.id,
            createdAt: now,
            updatedAt: now,
            publishedAt: undefined,
          }
        : null;
      const shouldAppendNext =
        nextContent && !hasDuplicateContentOccurrence(current.contentItems, content, nextContent.postDate) ? nextContent : null;

      return {
        ...current,
        contentItems: [
          ...current.contentItems.map((item) => (item.id === itemId ? published : item)),
          ...(shouldAppendNext ? [shouldAppendNext] : []),
        ],
      };
    });
  }

  function completeMaintenance(itemId: string) {
    setData((current) => {
      const maintenance = current.maintenanceItems.find((item) => item.id === itemId);
      if (!maintenance || maintenance.status === "concluído") return current;

      const now = new Date().toISOString();
      const nextDate = shouldCreateNext(maintenance.recurrence, maintenance.recurrenceStopped)
        ? nextDateForRecurrence(maintenance.date, maintenance.recurrence)
        : null;
      const completed: MaintenanceItem = { ...maintenance, status: "concluído", completedAt: now, updatedAt: now };
      const nextMaintenance: MaintenanceItem | null = nextDate
        ? {
            ...maintenance,
            id: createId("maintenance"),
            date: nextDate,
            status: "pendente",
            sourceId: maintenance.sourceId ?? maintenance.id,
            createdAt: now,
            updatedAt: now,
            completedAt: undefined,
          }
        : null;
      const shouldAppendNext =
        nextMaintenance && !hasDuplicateMaintenanceOccurrence(current.maintenanceItems, maintenance, nextMaintenance.date)
          ? nextMaintenance
          : null;

      return {
        ...current,
        maintenanceItems: [
          ...current.maintenanceItems.map((item) => (item.id === itemId ? completed : item)),
          ...(shouldAppendNext ? [shouldAppendNext] : []),
        ],
      };
    });
  }

  function payFinanceItem(itemId: string) {
    setData((current) => {
      const financeItem = current.financeItems.find((item) => item.id === itemId);
      if (!financeItem || financeItem.status === "pago") return current;

      const now = new Date().toISOString();
      const nextDate = shouldCreateNext(financeItem.recurrence, financeItem.recurrenceStopped)
        ? nextDateForRecurrence(financeItem.dueDate, financeItem.recurrence)
        : null;
      const paidItem: FinanceItem = { ...financeItem, status: "pago", paidAt: now, updatedAt: now };
      const nextItem: FinanceItem | null = nextDate
        ? {
            ...financeItem,
            id: createId("finance"),
            dueDate: nextDate,
            status: "pendente",
            sourceId: financeItem.sourceId ?? financeItem.id,
            createdAt: now,
            updatedAt: now,
            paidAt: undefined,
          }
        : null;
      const shouldAppendNext = nextItem && !hasDuplicateFinanceOccurrence(current.financeItems, financeItem, nextItem.dueDate) ? nextItem : null;

      return {
        ...current,
        financeItems: [
          ...current.financeItems.map((item) => (item.id === itemId ? paidItem : item)),
          ...(shouldAppendNext ? [shouldAppendNext] : []),
        ],
      };
    });
  }

  function cancelFinanceItem(itemId: string) {
    setData((current) => ({
      ...current,
      financeItems: current.financeItems.map((item) =>
        item.id === itemId ? { ...item, status: "cancelado", updatedAt: new Date().toISOString() } : item,
      ),
    }));
  }

  function completeTask(taskId: string) {
    setData((current) => {
      const task = current.generalTasks.find((item) => item.id === taskId);
      if (!task || task.status === "concluído") return current;

      const now = new Date().toISOString();
      const nextDate = shouldCreateNext(task.recurrence, task.recurrenceStopped) ? nextDateForRecurrence(task.date, task.recurrence) : null;
      const completed: GeneralTask = { ...task, status: "concluído", completedAt: now, updatedAt: now };
      const nextTask: GeneralTask | null = nextDate
        ? {
            ...task,
            id: createId("task"),
            date: nextDate,
            status: "pendente",
            sourceId: task.sourceId ?? task.id,
            createdAt: now,
            updatedAt: now,
            completedAt: undefined,
          }
        : null;
      const shouldAppendNext = nextTask && !hasDuplicateTaskOccurrence(current.generalTasks, task, nextTask.date) ? nextTask : null;

      return {
        ...current,
        generalTasks: [
          ...current.generalTasks.map((item) => (item.id === taskId ? completed : item)),
          ...(shouldAppendNext ? [shouldAppendNext] : []),
        ],
      };
    });
  }

  function stopEventRecurrence(event: CalendarEvent) {
    const now = new Date().toISOString();
    setData((current) => {
      if (event.kind === "conteúdo") {
        return {
          ...current,
          contentItems: current.contentItems.map((item) =>
            item.id === event.id ? { ...item, recurrenceStopped: true, recurrence: "nunca mais", updatedAt: now } : item,
          ),
        };
      }
      if (event.kind === "manutenção") {
        return {
          ...current,
          maintenanceItems: current.maintenanceItems.map((item) =>
            item.id === event.id ? { ...item, recurrenceStopped: true, recurrence: "nunca mais", updatedAt: now } : item,
          ),
        };
      }
      if (event.kind === "financeiro") {
        return {
          ...current,
          financeItems: current.financeItems.map((item) =>
            item.id === event.id ? { ...item, recurrenceStopped: true, recurrence: "nunca mais", updatedAt: now } : item,
          ),
        };
      }
      if (event.kind === "tarefa") {
        return {
          ...current,
          generalTasks: current.generalTasks.map((item) =>
            item.id === event.id ? { ...item, recurrenceStopped: true, recurrence: "nunca mais", updatedAt: now } : item,
          ),
        };
      }
      return {
        ...current,
        reminders: current.reminders.map((item) =>
          item.id === event.id ? { ...item, recurrenceStopped: true, recurrence: "nunca mais", updatedAt: now } : item,
        ),
      };
    });
  }

  function completeEvent(event: CalendarEvent) {
    if (event.kind === "conteúdo") publishContent(event.id);
    if (event.kind === "manutenção") completeMaintenance(event.id);
    if (event.kind === "financeiro") payFinanceItem(event.id);
    if (event.kind === "tarefa") completeTask(event.id);
    if (event.kind === "renovação" || event.kind === "lembrete") completeReminder(event.id);
  }

  function cancelEvent(event: CalendarEvent) {
    if (event.kind === "financeiro") cancelFinanceItem(event.id);
    if (event.kind === "renovação" || event.kind === "lembrete") ignoreReminder(event.id);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Organizador de projetos</p>
          <h1>Calendário operacional</h1>
        </div>
        <div className="topbar-actions">
          <button className="primary-button quick-create-button" type="button" onClick={() => setQuickCreateOpen(true)}>
            <Plus size={16} />
            <span>Criar rápido</span>
          </button>
          <nav className="view-tabs" aria-label="Navegação principal">
            {(["calendário", "dashboard", "projetos", "conteúdo", "manutenção", "renovações", "financeiro", "tarefas"] as AppView[]).map((view) => (
              <button className={activeView === view ? "active" : ""} key={view} type="button" onClick={() => setActiveView(view)}>
                {view === "calendário" && <CalendarDays size={17} />}
                {view === "dashboard" && <Gauge size={17} />}
                {view === "projetos" && <FolderKanban size={17} />}
                {view === "conteúdo" && <Megaphone size={17} />}
                {view === "manutenção" && <ServerCog size={17} />}
                {view === "renovações" && <RotateCcw size={17} />}
                {view === "financeiro" && <WalletCards size={17} />}
                {view === "tarefas" && <ListChecks size={17} />}
                <span>{capitalize(view)}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main-layout">
        {activeView === "calendário" && (
          <CalendarBoard
            events={filteredEvents}
            allEvents={calendarEvents}
            projects={data.projects}
            filters={filters}
            summary={summary}
            alerts={automaticAlerts}
            mode={calendarMode}
            selectedDate={selectedDate}
            onModeChange={setCalendarMode}
            onDateChange={setSelectedDate}
            onFilterChange={setFilters}
            onCompleteEvent={completeEvent}
            onCancelEvent={cancelEvent}
            onStopEvent={stopEventRecurrence}
            onMissingOrigin={showMissingOrigin}
          />
        )}

        {activeView === "dashboard" && (
          <DashboardView
            data={data}
            events={calendarEvents}
            financeStats={financeStats}
            onCompleteEvent={completeEvent}
            onCancelEvent={cancelEvent}
            onStopEvent={stopEventRecurrence}
            onMissingOrigin={showMissingOrigin}
          />
        )}

        {activeView === "projetos" && (
          <ProjectManager
            data={data}
            events={calendarEvents}
            financeStats={financeStats}
            onSave={upsertProject}
            onDelete={deleteProject}
            onMissingOrigin={showMissingOrigin}
          />
        )}

        {activeView === "conteúdo" && (
          <ContentManager
            projects={data.projects}
            items={data.contentItems}
            onSave={upsertContent}
            onDelete={deleteContent}
            onPublish={publishContent}
            onStop={(id) => stopEventRecurrence(calendarEvents.find((event) => event.kind === "conteúdo" && event.id === id)!)}
            onMissingOrigin={showMissingOrigin}
          />
        )}

        {activeView === "manutenção" && (
          <MaintenanceManager
            projects={data.projects}
            items={data.maintenanceItems}
            onSave={upsertMaintenance}
            onDelete={deleteMaintenance}
            onComplete={completeMaintenance}
            onStop={(id) => stopEventRecurrence(calendarEvents.find((event) => event.kind === "manutenção" && event.id === id)!)}
            onMissingOrigin={showMissingOrigin}
          />
        )}

        {activeView === "renovações" && (
          <ReminderManager
            projects={data.projects}
            reminders={data.reminders}
            onSave={upsertReminder}
            onDelete={deleteReminder}
            onComplete={completeReminder}
            onIgnore={ignoreReminder}
            onStop={stopEventRecurrence}
            onMissingOrigin={showMissingOrigin}
          />
        )}

        {activeView === "financeiro" && (
          <FinanceManager
            projects={data.projects}
            financeItems={data.financeItems}
            stats={financeStats}
            onSave={upsertFinanceItem}
            onDelete={deleteFinanceItem}
            onPay={payFinanceItem}
            onCancel={cancelFinanceItem}
            onStop={(id) => stopEventRecurrence(calendarEvents.find((event) => event.kind === "financeiro" && event.id === id)!)}
            onMissingOrigin={showMissingOrigin}
          />
        )}

        {activeView === "tarefas" && (
          <TaskManager
            projects={data.projects}
            tasks={data.generalTasks}
            onSave={upsertTask}
            onDelete={deleteTask}
            onComplete={completeTask}
            onStop={(id) => stopEventRecurrence(calendarEvents.find((event) => event.kind === "tarefa" && event.id === id)!)}
            onMissingOrigin={showMissingOrigin}
          />
        )}
      </main>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {quickCreateOpen && (
        <QuickCreatePanel
          projects={data.projects}
          onClose={() => setQuickCreateOpen(false)}
          onSaveContent={upsertContent}
          onSaveMaintenance={upsertMaintenance}
          onSaveFinance={upsertFinanceItem}
          onSaveReminder={upsertReminder}
          onSaveTask={upsertTask}
        />
      )}
    </div>
  );
}

function QuickCreatePanel({
  projects,
  onClose,
  onSaveContent,
  onSaveMaintenance,
  onSaveFinance,
  onSaveReminder,
  onSaveTask,
}: {
  projects: Project[];
  onClose: () => void;
  onSaveContent: (item: ContentItem) => void;
  onSaveMaintenance: (item: MaintenanceItem) => void;
  onSaveFinance: (item: FinanceItem) => void;
  onSaveReminder: (reminder: Reminder) => void;
  onSaveTask: (task: GeneralTask) => void;
}) {
  const [kind, setKind] = useState<QuickKind>("tarefa");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [date, setDate] = useState(todayKey());
  const [priority, setPriority] = useState<Priority>("média");
  const [recurrence, setRecurrence] = useState<Recurrence>("único");
  const [originUrl, setOriginUrl] = useState("");
  const [platform, setPlatform] = useState<ContentPlatform>("Instagram");
  const [contentType, setContentType] = useState<ContentType>("post comum");
  const [amountBrl, setAmountBrl] = useState(0);
  const [amountUsd, setAmountUsd] = useState(0);

  function resetType(nextKind: QuickKind) {
    setKind(nextKind);
    setTitle("");
    setDate(todayKey());
    setPriority("média");
    setRecurrence(nextKind === "financeiro" ? "mensal" : "único");
    setOriginUrl("");
    setAmountBrl(0);
    setAmountUsd(0);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const safeProjectId = projectId || projects[0]?.id || "";
    const safeTitle = title.trim() || quickTitleFallback(kind);
    const recurrenceStopped = recurrence === "nunca mais";

    if (kind === "conteúdo") {
      onSaveContent({
        id: createId("content"),
        title: safeTitle,
        projectId: safeProjectId,
        platform,
        type: contentType,
        status: "ideia",
        postDate: date,
        priority,
        caption: "",
        assetUrl: originUrl,
        notes: "",
        recurrence,
        recurrenceStopped,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (kind === "manutenção") {
      onSaveMaintenance({
        id: createId("maintenance"),
        title: safeTitle,
        projectId: safeProjectId,
        kind: "Atualizar projeto",
        date,
        recurrence,
        priority,
        status: "pendente",
        originUrl,
        notes: "",
        recurrenceStopped,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (kind === "financeiro") {
      onSaveFinance({
        id: createId("finance"),
        name: safeTitle,
        projectId: safeProjectId,
        amountBrl: Number(amountBrl) || 0,
        amountUsd: Number(amountUsd) || 0,
        dueDate: date,
        recurrence,
        status: "pendente",
        originUrl,
        notes: "",
        recurrenceStopped,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (kind === "renovação") {
      onSaveReminder({
        id: createId("reminder"),
        title: safeTitle,
        projectId: safeProjectId,
        dueDate: date,
        type: "renovação",
        recurrence,
        priority,
        status: "pendente",
        notes: "",
        originUrl,
        recurrenceStopped,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (kind === "tarefa") {
      onSaveTask({
        id: createId("task"),
        title: safeTitle,
        projectId: safeProjectId,
        category: "operação",
        date,
        priority,
        status: "pendente",
        recurrence,
        originUrl,
        notes: "",
        recurrenceStopped,
        createdAt: now,
        updatedAt: now,
      });
    }

    onClose();
  }

  return (
    <div className="quick-create-overlay" role="dialog" aria-modal="true" aria-labelledby="quick-create-title">
      <section className="quick-create-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Novo item</p>
            <h2 id="quick-create-title">Criar rápido</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar criação rápida">
            <X size={18} />
          </button>
        </div>

        <div className="quick-type-grid" role="group" aria-label="Tipo de item">
          {quickKindOptions.map((option) => (
            <button className={kind === option ? "active" : ""} key={option} type="button" onClick={() => resetType(option)}>
              {eventIcon(option === "renovação" ? "renovação" : option, 16)}
              <span>{option === "conteúdo" ? "Conteúdo/Post" : capitalize(option)}</span>
            </button>
          ))}
        </div>

        <form className="data-form" onSubmit={submit}>
          <label>
            Título
            <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </label>
          <ProjectSelect value={projectId} projects={projects} onChange={setProjectId} />
          <div className="form-grid">
            <label>
              Data
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label>
              Prioridade
              <PrioritySelect value={priority} onChange={setPriority} />
            </label>
          </div>
          <label>
            Recorrência
            <RecurrenceSelect value={recurrence} onChange={setRecurrence} />
          </label>

          {kind === "conteúdo" && (
            <div className="form-grid">
              <label>
                Plataforma
                <select value={platform} onChange={(event) => setPlatform(event.target.value as ContentPlatform)}>
                  {contentPlatformOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tipo de conteúdo
                <select value={contentType} onChange={(event) => setContentType(event.target.value as ContentType)}>
                  {contentTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {kind === "financeiro" && (
            <div className="form-grid">
              <label>
                Valor em R$
                <input type="number" min="0" step="0.01" value={amountBrl} onChange={(event) => setAmountBrl(Number(event.target.value))} />
              </label>
              <label>
                Valor em US$
                <input type="number" min="0" step="0.01" value={amountUsd} onChange={(event) => setAmountUsd(Number(event.target.value))} />
              </label>
            </div>
          )}

          <label>
            Link de origem opcional
            <input inputMode="url" value={originUrl} onChange={(event) => setOriginUrl(event.target.value)} />
          </label>
          <div className="button-row">
            <button className="primary-button" type="submit">
              <Save size={16} />
              <span>Criar item</span>
            </button>
            <button className="ghost-button" type="button" onClick={onClose}>
              <X size={16} />
              <span>Cancelar</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

interface CalendarBoardProps {
  events: CalendarEvent[];
  allEvents: CalendarEvent[];
  projects: Project[];
  filters: CalendarFilters;
  summary: { today: number; week: number; month: number; late: number };
  alerts: CalendarEvent[];
  mode: CalendarMode;
  selectedDate: string;
  onModeChange: (mode: CalendarMode) => void;
  onDateChange: (date: string) => void;
  onFilterChange: (filters: CalendarFilters) => void;
  onCompleteEvent: (event: CalendarEvent) => void;
  onCancelEvent: (event: CalendarEvent) => void;
  onStopEvent: (event: CalendarEvent) => void;
  onMissingOrigin: () => void;
}

function CalendarBoard({
  events,
  allEvents,
  projects,
  filters,
  summary,
  alerts,
  mode,
  selectedDate,
  onModeChange,
  onDateChange,
  onFilterChange,
  onCompleteEvent,
  onCancelEvent,
  onStopEvent,
  onMissingOrigin,
}: CalendarBoardProps) {
  const focusEvents = useMemo(() => buildTodayFocusEvents(events), [events]);
  const visibleEvents = useMemo(() => {
    if (mode === "dia") return events.filter((event) => event.date === selectedDate || isAlwaysVisible(event));
    if (mode === "semana") {
      const start = startOfWeek(selectedDate);
      const end = endOfWeek(selectedDate);
      return events.filter((event) => isAlwaysVisible(event) || isWithinInclusive(event.date, start, end));
    }
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return events.filter((event) => isAlwaysVisible(event) || isWithinInclusive(event.date, start, end));
  }, [events, mode, selectedDate]);

  function move(direction: -1 | 1) {
    if (mode === "dia") onDateChange(addDays(selectedDate, direction));
    if (mode === "semana") onDateChange(addDays(selectedDate, direction * 7));
    if (mode === "mês") onDateChange(addMonths(selectedDate, direction));
  }

  return (
    <div className="calendar-screen">
      <section className="calendar-toolbar">
        <div className="date-nav">
          <button className="icon-button" type="button" onClick={() => move(-1)} aria-label="Voltar">
            <ChevronLeft size={18} />
          </button>
          <div>
            <p className="eyebrow">Período selecionado</p>
            <h2>{mode === "mês" ? formatMonthTitle(selectedDate) : formatLongDate(selectedDate)}</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => move(1)} aria-label="Avançar">
            <ChevronRight size={18} />
          </button>
          <button className="secondary-button" type="button" onClick={() => onDateChange(todayKey())}>
            <Clock3 size={16} />
            <span>Hoje</span>
          </button>
        </div>

        <div className="segmented-control" role="group" aria-label="Modo do calendário">
          {(["dia", "semana", "mês"] as CalendarMode[]).map((item) => (
            <button className={mode === item ? "active" : ""} type="button" key={item} onClick={() => onModeChange(item)}>
              {capitalize(item)}
            </button>
          ))}
        </div>
      </section>

      <TodayFocusPanel
        events={focusEvents}
        onComplete={onCompleteEvent}
        onMissingOrigin={onMissingOrigin}
      />

      <FilterBar filters={filters} projects={projects} events={allEvents} onChange={onFilterChange} />

      <section className="summary-strip" aria-label="Resumo operacional">
        <SummaryCard label="Hoje" value={summary.today} tone="green" />
        <SummaryCard label="Semana" value={summary.week} tone="yellow" />
        <SummaryCard label="Mês" value={summary.month} tone="blue" />
        <SummaryCard label="Atrasados" value={summary.late} tone="red" />
      </section>

      <section className="calendar-workspace">
        <div className="calendar-surface">
          {mode === "mês" && <MonthCalendar events={events} selectedDate={selectedDate} onDateChange={onDateChange} />}
          {mode === "semana" && <WeekCalendar events={events} selectedDate={selectedDate} />}
          {mode === "dia" && <DayCalendar events={visibleEvents} selectedDate={selectedDate} />}
        </div>

        <aside className="side-panel">
          <PanelHeading eyebrow="Fila do período" title={`${visibleEvents.length} itens`} icon={<Bell size={20} />} />
          <div className="event-list compact-list">
            {visibleEvents.length === 0 && <EmptyState text="Nada cadastrado para este período com os filtros atuais." />}
            {visibleEvents.map((event) => (
              <EventRow
                event={event}
                key={`${event.kind}-${event.id}`}
                onComplete={onCompleteEvent}
                onCancel={onCancelEvent}
                onStop={onStopEvent}
                onMissingOrigin={onMissingOrigin}
              />
            ))}
          </div>

          <PanelHeading eyebrow="Alertas automáticos" title="30, 15, 7, 1 e dia" className="with-gap" />
          <div className="alert-list">
            {alerts.length === 0 && <EmptyState text="Sem alertas nas janelas configuradas." />}
            {alerts.map((event) => (
              <div className={`alert-item ${statusClass(event.kind)}`} key={`alert-${event.kind}-${event.id}`}>
                <span className={`dot ${statusClass(event.status)}`} />
                <div>
                  <strong>{event.title}</strong>
                  <p>
                    {event.projectName} · {formatShortDate(event.date)}
                  </p>
                </div>
                <span className="alert-chip">{alertLabel(event.date) ?? "D-30"}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}

function TodayFocusPanel({
  events,
  onComplete,
  onMissingOrigin,
}: {
  events: CalendarEvent[];
  onComplete: (event: CalendarEvent) => void;
  onMissingOrigin: () => void;
}) {
  return (
    <section className="today-focus-panel" aria-label="Prioridades de hoje">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Agora</p>
          <h2>{events.length === 0 ? "Nada urgente no momento" : "O que fazer primeiro"}</h2>
        </div>
        <Clock3 size={20} />
      </div>

      <div className="today-focus-list">
        {events.length === 0 && <EmptyState text="Sem atrasados, críticos ou itens para hoje." />}
        {events.map((event) => {
          const done = isEventDone(event);
          const primaryLabel = event.kind === "financeiro" ? "Pagar" : event.kind === "conteúdo" ? "Publicar" : "Concluir";

          return (
            <article className={`today-focus-item ${statusClass(event.kind)} ${statusClass(event.status)} ${event.priority === "crítica" ? "is-critical" : ""}`} key={`${event.kind}-${event.id}`}>
              <div className="event-main">
                <div className="event-title-line">
                  {eventIcon(event.kind, 17)}
                  <strong>{event.title}</strong>
                </div>
                <p>
                  {event.projectName} · {capitalize(event.kind)} · {formatShortDate(event.date)}
                </p>
                <div className="meta-line">
                  <StatusBadge value={event.status} compact />
                  {event.priority && <StatusBadge value={event.priority} compact />}
                  {event.type && <span className="meta-chip">{event.type}</span>}
                </div>
              </div>
              <div className="focus-actions">
                {!done ? (
                  <button className="primary-button" type="button" onClick={() => onComplete(event)}>
                    <Check size={16} />
                    <span>{primaryLabel}</span>
                  </button>
                ) : (
                  <OriginButton url={event.originUrl} onMissing={onMissingOrigin} />
                )}
                {!done && <OriginButton url={event.originUrl} onMissing={onMissingOrigin} />}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FilterBar({
  filters,
  projects,
  events,
  onChange,
}: {
  filters: CalendarFilters;
  projects: Project[];
  events: CalendarEvent[];
  onChange: (filters: CalendarFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const availableStatuses = [...new Set([...calendarStatusOptions, ...events.map((event) => event.status)])];
  const activeFilters = describeActiveFilters(filters, projects);

  return (
    <section className="filter-panel" aria-label="Filtros do calendário">
      <div className="panel-heading filter-heading">
        <div>
          <p className="eyebrow">Filtros avançados</p>
          <h2>{activeFilters.length === 0 ? "Nenhum filtro ativo" : activeFilters.join(" · ")}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={() => setOpen((current) => !current)}>
          <SlidersHorizontal size={16} />
          <span>{open ? "Ocultar" : "Mostrar"}</span>
        </button>
      </div>
      {open && (
        <div className="filter-grid">
          <label>
            Projeto
            <select value={filters.projectId} onChange={(event) => onChange({ ...filters, projectId: event.target.value })}>
              <option value="todos">Todos</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoria
            <select value={filters.category} onChange={(event) => onChange({ ...filters, category: event.target.value })}>
              <option value="todos">Todas</option>
              {calendarCategoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}>
              <option value="todos">Todos</option>
              {availableStatuses.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridade
            <select value={filters.priority} onChange={(event) => onChange({ ...filters, priority: event.target.value })}>
              <option value="todos">Todas</option>
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data
            <input type="date" value={filters.date} onChange={(event) => onChange({ ...filters, date: event.target.value })} />
          </label>
          <label>
            Plataforma
            <select value={filters.platform} onChange={(event) => onChange({ ...filters, platform: event.target.value })}>
              <option value="todos">Todas</option>
              {contentPlatformOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Recorrência
            <select value={filters.recurrence} onChange={(event) => onChange({ ...filters, recurrence: event.target.value })}>
              <option value="todos">Todas</option>
              {recurrenceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-button clear-filters" type="button" onClick={() => onChange(emptyFilters)}>
            <X size={16} />
            <span>Limpar</span>
          </button>
        </div>
      )}
    </section>
  );
}

function DashboardView({
  data,
  events,
  financeStats,
  onCompleteEvent,
  onCancelEvent,
  onStopEvent,
  onMissingOrigin,
}: {
  data: AppData;
  events: CalendarEvent[];
  financeStats: ReturnType<typeof buildFinanceStats>;
  onCompleteEvent: (event: CalendarEvent) => void;
  onCancelEvent: (event: CalendarEvent) => void;
  onStopEvent: (event: CalendarEvent) => void;
  onMissingOrigin: () => void;
}) {
  const pendingEvents = events.filter((event) => !isEventDone(event));
  const todayEvents = buildTodayFocusEvents(events).slice(0, 8);
  const lateEvents = pendingEvents.filter((event) => event.status === "atrasado").slice(0, 8);
  const renewals = pendingEvents.filter((event) => event.kind === "renovação").sort(sortByDate).slice(0, 6);
  const posts = pendingEvents.filter((event) => event.kind === "conteúdo").sort(sortByDate).slice(0, 6);
  const maintenance = pendingEvents.filter((event) => event.kind === "manutenção").sort(sortByDate).slice(0, 6);
  const projectsWithAttention = data.projects.filter((project) => ["atenção", "vencendo", "parado"].includes(project.status));
  const taskBuckets = buildTaskBuckets(data.generalTasks);

  return (
    <div className="dashboard-screen">
      <section className="summary-strip">
        <SummaryCard label="Gastos R$ mês" value={formatCurrency(financeStats.monthBrl, "BRL")} tone="green" />
        <SummaryCard label="Gastos US$ mês" value={formatCurrency(financeStats.monthUsd, "USD")} tone="blue" />
        <SummaryCard label="Projetos atenção" value={projectsWithAttention.length} tone="yellow" />
        <SummaryCard label="Atrasados" value={lateEvents.length} tone="red" />
      </section>

      <section className="dashboard-grid">
        <DashboardPanel title="Hoje" eyebrow="O que fazer agora">
          <EventMiniList
            events={todayEvents}
            empty="Nada pendente para hoje."
            onComplete={onCompleteEvent}
            onCancel={onCancelEvent}
            onStop={onStopEvent}
            onMissingOrigin={onMissingOrigin}
          />
        </DashboardPanel>
        <DashboardPanel title="Atrasado" eyebrow="Itens que pedem ação">
          <EventMiniList
            events={lateEvents}
            empty="Nenhum item atrasado."
            onComplete={onCompleteEvent}
            onCancel={onCancelEvent}
            onStop={onStopEvent}
            onMissingOrigin={onMissingOrigin}
          />
        </DashboardPanel>
        <DashboardPanel title="Renovações" eyebrow="Próximas janelas">
          <EventMiniList
            events={renewals}
            empty="Sem renovações próximas."
            onComplete={onCompleteEvent}
            onCancel={onCancelEvent}
            onStop={onStopEvent}
            onMissingOrigin={onMissingOrigin}
          />
        </DashboardPanel>
        <DashboardPanel title="Posts" eyebrow="Conteúdo em fila">
          <EventMiniList
            events={posts}
            empty="Sem posts próximos."
            onComplete={onCompleteEvent}
            onCancel={onCancelEvent}
            onStop={onStopEvent}
            onMissingOrigin={onMissingOrigin}
          />
        </DashboardPanel>
        <DashboardPanel title="Manutenção" eyebrow="Rotina técnica">
          <EventMiniList
            events={maintenance}
            empty="Sem manutenções próximas."
            onComplete={onCompleteEvent}
            onCancel={onCancelEvent}
            onStop={onStopEvent}
            onMissingOrigin={onMissingOrigin}
          />
        </DashboardPanel>
        <DashboardPanel title="Projetos" eyebrow="Precisam de atenção">
          <div className="project-alert-list">
            {projectsWithAttention.map((project) => (
              <div className={`project-alert ${statusClass(project.status)}`} key={project.id}>
                <strong>{project.name}</strong>
                <StatusBadge value={project.status} compact />
              </div>
            ))}
            {projectsWithAttention.length === 0 && <EmptyState text="Nenhum projeto marcado com atenção." />}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Categorias" eyebrow="Tarefas gerais">
          <div className="bucket-list">
            {taskBuckets.map((bucket) => (
              <div className="bucket-row" key={bucket.category}>
                <span>{bucket.category}</span>
                <strong>{bucket.count}</strong>
              </div>
            ))}
            {taskBuckets.length === 0 && <EmptyState text="Sem tarefas gerais pendentes." />}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Financeiro" eyebrow="Resumo do mês">
          <div className="money-stack">
            <strong>{formatCurrency(financeStats.monthBrl, "BRL")}</strong>
            <span>{formatCurrency(financeStats.monthUsd, "USD")}</span>
            <p>Estimado anual: {formatCurrency(financeStats.annualBrl, "BRL")} · {formatCurrency(financeStats.annualUsd, "USD")}</p>
          </div>
        </DashboardPanel>
      </section>
    </div>
  );
}

function EventMiniList({
  events,
  empty,
  onComplete,
  onCancel,
  onStop,
  onMissingOrigin,
}: {
  events: CalendarEvent[];
  empty: string;
  onComplete: (event: CalendarEvent) => void;
  onCancel: (event: CalendarEvent) => void;
  onStop: (event: CalendarEvent) => void;
  onMissingOrigin: () => void;
}) {
  if (events.length === 0) return <EmptyState text={empty} />;

  return (
    <div className="event-list">
      {events.map((event) => (
        <EventRow
          event={event}
          key={`${event.kind}-${event.id}`}
          dense
          onComplete={onComplete}
          onCancel={onCancel}
          onStop={onStop}
          onMissingOrigin={onMissingOrigin}
        />
      ))}
    </div>
  );
}

function MonthCalendar({
  events,
  selectedDate,
  onDateChange,
}: {
  events: CalendarEvent[];
  selectedDate: string;
  onDateChange: (date: string) => void;
}) {
  const days = monthGrid(selectedDate);

  return (
    <div className="month-calendar">
      {weekLabels.map((label) => (
        <div className="weekday" key={label}>
          {label}
        </div>
      ))}
      {days.map((day) => {
        const eventsForDay = events.filter((event) => event.date === day).slice(0, 4);
        const overflow = events.filter((event) => event.date === day).length - eventsForDay.length;

        return (
          <button
            className={`day-cell ${isSameMonth(day, selectedDate) ? "" : "outside"} ${day === todayKey() ? "today" : ""} ${
              day === selectedDate ? "selected" : ""
            }`}
            type="button"
            key={day}
            onClick={() => onDateChange(day)}
          >
            <span className="day-number">{day.slice(-2)}</span>
            <span className="event-pills">
              {eventsForDay.map((event) => (
                <span className={`event-pill ${statusClass(event.kind)} ${statusClass(event.status)}`} key={`${event.kind}-${event.id}`}>
                  {eventIcon(event.kind, 12)}
                  <span>{event.title}</span>
                </span>
              ))}
              {overflow > 0 && <span className="more-pill">+{overflow} itens</span>}
              {eventsForDay.length === 0 && <span className="empty-mini">Livre</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function WeekCalendar({ events, selectedDate }: { events: CalendarEvent[]; selectedDate: string }) {
  const days = getWeekDays(selectedDate);

  return (
    <div className="week-calendar">
      {days.map((day) => {
        const dayEvents = events.filter((event) => event.date === day || isAlwaysVisible(event));
        return (
          <div className={`week-day ${day === todayKey() ? "today" : ""}`} key={day}>
            <div className="week-day-header">
              <span>{weekLabels[parseDateDay(day)]}</span>
              <strong>{formatShortDate(day)}</strong>
            </div>
            <div className="mini-event-stack">
              {dayEvents.map((event) => (
                <article className={`mini-event ${statusClass(event.kind)} ${statusClass(event.status)}`} key={`${event.kind}-${event.id}`}>
                  <strong>{event.title}</strong>
                  <span>{event.projectName}</span>
                  <small>{capitalize(event.kind)} · {event.recurrence}</small>
                </article>
              ))}
              {dayEvents.length === 0 && <span className="empty-mini">Sem itens</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayCalendar({ events, selectedDate }: { events: CalendarEvent[]; selectedDate: string }) {
  return (
    <div className="day-board">
      <div className="day-hero">
        <p className="eyebrow">Dia selecionado</p>
        <h3>{formatLongDate(selectedDate)}</h3>
        <span>{events.length} itens planejados ou permanentes</span>
      </div>
      <div className="day-lanes">
        {calendarCategoryOptions.map((category) => {
          const categoryEvents = events.filter((event) => event.kind === category);
          return (
            <section className={`lane ${statusClass(category)}`} key={category}>
              <h4>{capitalize(category)}</h4>
              {categoryEvents.map((event) => (
                <article className={`lane-card ${statusClass(event.kind)} ${statusClass(event.status)}`} key={`${event.kind}-${event.id}`}>
                  <strong>{event.title}</strong>
                  <span>{event.projectName}</span>
                  <small>
                    {event.priority ?? "sem prioridade"} · {event.rawStatus}
                  </small>
                </article>
              ))}
              {categoryEvents.length === 0 && <span className="empty-mini">Sem itens</span>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface EventRowProps {
  event: CalendarEvent;
  dense?: boolean;
  onComplete: (event: CalendarEvent) => void;
  onCancel: (event: CalendarEvent) => void;
  onStop: (event: CalendarEvent) => void;
  onMissingOrigin: () => void;
}

function EventRow({ event, dense = false, onComplete, onCancel, onStop, onMissingOrigin }: EventRowProps) {
  const done = isEventDone(event);
  const canCancel = event.kind === "financeiro" || event.kind === "renovação" || event.kind === "lembrete";
  const canStop = !event.recurrenceStopped && !["único", "nunca mais"].includes(event.recurrence);
  const completeLabel = event.kind === "financeiro" ? "Pagar" : event.kind === "conteúdo" ? "Publicar" : "Concluir";

  return (
    <article className={`event-row ${dense ? "dense" : ""} ${statusClass(event.kind)} ${statusClass(event.status)}`}>
      <div className="event-main">
        <div className="event-title-line">
          {eventIcon(event.kind, 16)}
          <strong>{event.title}</strong>
        </div>
        <p>
          {event.projectName} · {formatShortDate(event.date)} · {capitalize(event.kind)}
        </p>
        <div className="meta-line">
          <StatusBadge value={event.status} compact />
          {event.priority && <StatusBadge value={event.priority} compact />}
          {event.platform && <span className="meta-chip">{event.platform}</span>}
          {event.type && <span className="meta-chip">{event.type}</span>}
          <span className="meta-chip">{event.recurrenceStopped ? "nunca mais" : event.recurrence}</span>
          {event.kind === "financeiro" && (
            <span className="money-chip">
              {formatCurrency(event.amountBrl ?? 0, "BRL")} · {formatCurrency(event.amountUsd ?? 0, "USD")}
            </span>
          )}
        </div>
      </div>
      <div className="row-actions">
        <OriginButton url={event.originUrl} onMissing={onMissingOrigin} />
        {!done && (
          <button className="primary-button" type="button" onClick={() => onComplete(event)}>
            <Check size={16} />
            <span>{completeLabel}</span>
          </button>
        )}
        {!done && canCancel && (
          <button className="ghost-button" type="button" onClick={() => onCancel(event)}>
            <Ban size={16} />
            <span>{event.kind === "financeiro" ? "Cancelar" : "Ignorar"}</span>
          </button>
        )}
        {canStop && (
          <button className="ghost-button danger-text" type="button" onClick={() => onStop(event)}>
            <RotateCcw size={16} />
            <span>{event.recurrence === "permanente" ? "Desativar" : "Nunca mais"}</span>
          </button>
        )}
      </div>
    </article>
  );
}

function ProjectManager({
  data,
  events,
  financeStats,
  onSave,
  onDelete,
  onMissingOrigin,
}: {
  data: AppData;
  events: CalendarEvent[];
  financeStats: ReturnType<typeof buildFinanceStats>;
  onSave: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onMissingOrigin: () => void;
}) {
  const [draft, setDraft] = useState<ProjectDraft>(emptyProject);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState(data.projects[0]?.id ?? "");
  const selectedProject = data.projects.find((project) => project.id === selectedProjectId) ?? data.projects[0];

  useEffect(() => {
    if (!selectedProjectId && data.projects[0]) setSelectedProjectId(data.projects[0].id);
    if (selectedProjectId && !data.projects.some((project) => project.id === selectedProjectId)) setSelectedProjectId(data.projects[0]?.id ?? "");
  }, [data.projects, selectedProjectId]);

  function edit(project: Project) {
    setEditingId(project.id);
    setDraft({
      name: project.name,
      siteUrl: project.siteUrl,
      description: project.description,
      platform: project.platform,
      status: project.status,
      notes: project.notes,
      adminUrl: project.adminUrl,
    });
    setSelectedProjectId(project.id);
  }

  function reset() {
    setEditingId(null);
    setDraft(emptyProject);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const existing = data.projects.find((project) => project.id === editingId);
    const project: Project = {
      id: existing?.id ?? createId("project"),
      ...draft,
      name: draft.name.trim() || "Projeto sem nome",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(project);
    setSelectedProjectId(project.id);
    reset();
  }

  return (
    <div className="management-screen project-screen">
      <section className="form-panel">
        <PanelHeading eyebrow="Cadastro" title={editingId ? "Editar projeto" : "Novo projeto"} />
        <form className="data-form" onSubmit={submit}>
          <label>
            Nome do projeto
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label>
            Descrição
            <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </label>
          <label>
            Link do site/app
            <input inputMode="url" value={draft.siteUrl} onChange={(event) => setDraft({ ...draft, siteUrl: event.target.value })} />
          </label>
          <label>
            Link do painel/admin/origem
            <input inputMode="url" value={draft.adminUrl} onChange={(event) => setDraft({ ...draft, adminUrl: event.target.value })} />
          </label>
          <div className="form-grid">
            <label>
              Plataforma
              <select value={draft.platform} onChange={(event) => setDraft({ ...draft, platform: event.target.value as Platform })}>
                {platformOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ProjectStatus })}>
                {projectStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Observações
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
          <div className="button-row">
            <button className="primary-button" type="submit">
              <Save size={16} />
              <span>{editingId ? "Salvar" : "Criar"}</span>
            </button>
            {editingId && (
              <button className="ghost-button" type="button" onClick={reset}>
                <X size={16} />
                <span>Cancelar</span>
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="list-panel">
        <PanelHeading eyebrow="Projetos" title={`${data.projects.length} projetos`} />
        <div className="project-grid">
          {data.projects.map((project) => (
            <article className={`project-card ${statusClass(project.status)}`} key={project.id}>
              <div className="card-topline">
                <span>{project.platform}</span>
                <StatusBadge value={project.status} compact />
              </div>
              <h3>{project.name}</h3>
              <p>{project.description || "Sem descrição."}</p>
              <div className="card-actions">
                <button className="secondary-button" type="button" onClick={() => setSelectedProjectId(project.id)}>
                  <FolderKanban size={16} />
                  <span>Ficha</span>
                </button>
                <OriginButton url={project.adminUrl || project.siteUrl} onMissing={onMissingOrigin} />
                <button className="ghost-button" type="button" onClick={() => edit(project)}>
                  <Pencil size={16} />
                  <span>Editar</span>
                </button>
                <button className="ghost-button danger-text" type="button" onClick={() => onDelete(project.id)}>
                  <Trash2 size={16} />
                  <span>Remover</span>
                </button>
              </div>
            </article>
          ))}
          {data.projects.length === 0 && <EmptyState text="Cadastre o primeiro projeto para organizar tarefas, conteúdo e gastos." />}
        </div>

        {selectedProject && (
          <ProjectDetail
            project={selectedProject}
            events={events}
            financeStats={financeStats}
            onMissingOrigin={onMissingOrigin}
          />
        )}
      </section>
    </div>
  );
}

function ProjectDetail({
  project,
  events,
  financeStats,
  onMissingOrigin,
}: {
  project: Project;
  events: CalendarEvent[];
  financeStats: ReturnType<typeof buildFinanceStats>;
  onMissingOrigin: () => void;
}) {
  const projectEvents = events.filter((event) => event.projectId === project.id && !isEventDone(event)).sort(sortByDate);
  const projectSpend = financeStats.byProject.find((item) => item.projectId === project.id);

  return (
    <section className="project-detail">
      <div className="detail-header">
        <div>
          <p className="eyebrow">Página do projeto</p>
          <h2>{project.name}</h2>
        </div>
        <StatusBadge value={project.status} />
      </div>
      <p>{project.description || "Sem descrição cadastrada."}</p>
      <div className="detail-actions">
        <OriginButton url={project.siteUrl} label="Abrir site/app" onMissing={onMissingOrigin} />
        <OriginButton url={project.adminUrl} label="Abrir origem" onMissing={onMissingOrigin} />
      </div>
      <div className="detail-grid">
        <ProjectSection title="Próximas tarefas" events={projectEvents.filter((event) => event.kind === "tarefa")} />
        <ProjectSection title="Próximos posts" events={projectEvents.filter((event) => event.kind === "conteúdo")} />
        <ProjectSection title="Próximas manutenções" events={projectEvents.filter((event) => event.kind === "manutenção")} />
        <ProjectSection title="Próximos pagamentos" events={projectEvents.filter((event) => event.kind === "financeiro")} />
      </div>
      <div className="project-money">
        <span>Gastos do projeto</span>
        <strong>
          {formatCurrency(projectSpend?.brl ?? 0, "BRL")} · {formatCurrency(projectSpend?.usd ?? 0, "USD")}
        </strong>
      </div>
      <div className="notes-box">
        <span>Observações</span>
        <p>{project.notes || "Sem observações."}</p>
      </div>
    </section>
  );
}

function ProjectSection({ title, events }: { title: string; events: CalendarEvent[] }) {
  const visible = events.slice(0, 4);
  return (
    <div className="project-section">
      <h3>{title}</h3>
      {visible.map((event) => (
        <div className={`project-section-row ${statusClass(event.kind)}`} key={`${event.kind}-${event.id}`}>
          <span>{event.title}</span>
          <strong>{formatShortDate(event.date)}</strong>
        </div>
      ))}
      {visible.length === 0 && <span className="empty-mini">Nada próximo</span>}
    </div>
  );
}

function ContentManager({
  projects,
  items,
  onSave,
  onDelete,
  onPublish,
  onStop,
  onMissingOrigin,
}: {
  projects: Project[];
  items: ContentItem[];
  onSave: (item: ContentItem) => void;
  onDelete: (itemId: string) => void;
  onPublish: (itemId: string) => void;
  onStop: (itemId: string) => void;
  onMissingOrigin: () => void;
}) {
  const [draft, setDraft] = useState<ContentDraft>({ ...emptyContent, projectId: projects[0]?.id ?? "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const projectName = (projectId: string) => projects.find((project) => project.id === projectId)?.name ?? "Sem projeto";
  const sortedItems = [...items].sort((a, b) => a.postDate.localeCompare(b.postDate));

  function edit(item: ContentItem) {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      projectId: item.projectId,
      platform: item.platform,
      type: item.type,
      status: item.status,
      postDate: item.postDate,
      priority: item.priority,
      caption: item.caption,
      assetUrl: item.assetUrl,
      notes: item.notes,
      recurrence: item.recurrence,
      recurrenceStopped: item.recurrenceStopped,
    });
  }

  function reset() {
    setEditingId(null);
    setDraft({ ...emptyContent, projectId: projects[0]?.id ?? "" });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const existing = items.find((item) => item.id === editingId);
    const content: ContentItem = {
      id: existing?.id ?? createId("content"),
      ...draft,
      title: draft.title.trim() || "Conteúdo sem título",
      projectId: draft.projectId || projects[0]?.id || "",
      recurrenceStopped: draft.recurrence === "nunca mais" ? true : draft.recurrenceStopped,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      publishedAt: draft.status === "publicado" ? existing?.publishedAt ?? now : undefined,
      sourceId: existing?.sourceId,
    };
    onSave(content);
    reset();
  }

  return (
    <div className="management-screen">
      <section className="form-panel">
        <PanelHeading eyebrow="Conteúdo / Posts" title={editingId ? "Editar conteúdo" : "Novo conteúdo"} />
        <form className="data-form" onSubmit={submit}>
          <label>
            Título
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <ProjectSelect value={draft.projectId} projects={projects} onChange={(projectId) => setDraft({ ...draft, projectId })} />
          <div className="form-grid">
            <label>
              Plataforma
              <select value={draft.platform} onChange={(event) => setDraft({ ...draft, platform: event.target.value as ContentPlatform })}>
                {contentPlatformOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipo
              <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ContentType })}>
                {contentTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label>
              Status
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ContentStatus })}>
                {contentStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prioridade
              <PrioritySelect value={draft.priority} onChange={(priority) => setDraft({ ...draft, priority })} />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Data de postagem
              <input type="date" value={draft.postDate} onChange={(event) => setDraft({ ...draft, postDate: event.target.value })} />
            </label>
            <label>
              Recorrência
              <RecurrenceSelect value={draft.recurrence} onChange={(recurrence) => setDraft({ ...draft, recurrence })} />
            </label>
          </div>
          <label>
            Texto/caption
            <textarea value={draft.caption} onChange={(event) => setDraft({ ...draft, caption: event.target.value })} />
          </label>
          <label>
            Link da arte, vídeo ou origem
            <input inputMode="url" value={draft.assetUrl} onChange={(event) => setDraft({ ...draft, assetUrl: event.target.value })} />
          </label>
          <label>
            Observações
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
          <StopCheckbox checked={draft.recurrenceStopped} onChange={(value) => setDraft({ ...draft, recurrenceStopped: value })} />
          <FormActions editing={Boolean(editingId)} onReset={reset} createLabel="Criar conteúdo" />
        </form>
      </section>

      <section className="list-panel">
        <PanelHeading eyebrow="Fila de conteúdo" title={`${items.length} conteúdos`} />
        <div className="event-list">
          {sortedItems.map((item) => (
            <article className={`event-row conteudo ${statusClass(getContentCalendarStatus(item))}`} key={item.id}>
              <div className="event-main">
                <div className="event-title-line">
                  <Megaphone size={16} />
                  <strong>{item.title}</strong>
                </div>
                <p>
                  {projectName(item.projectId)} · {formatLongDate(item.postDate)}
                </p>
                <div className="meta-line">
                  <StatusBadge value={getContentCalendarStatus(item)} compact />
                  <StatusBadge value={item.priority} compact />
                  <span className="meta-chip">{item.platform}</span>
                  <span className="meta-chip">{item.type}</span>
                  <span className="meta-chip">{item.recurrenceStopped ? "nunca mais" : item.recurrence}</span>
                </div>
                {item.caption && <p className="notes">{item.caption}</p>}
                {item.notes && <p className="notes">{item.notes}</p>}
              </div>
              <div className="row-actions">
                <OriginButton url={item.assetUrl} onMissing={onMissingOrigin} />
                {item.status !== "publicado" && (
                  <button className="primary-button" type="button" onClick={() => onPublish(item.id)}>
                    <Check size={16} />
                    <span>Publicar</span>
                  </button>
                )}
                {!item.recurrenceStopped && !["único", "nunca mais"].includes(item.recurrence) && (
                  <button className="ghost-button danger-text" type="button" onClick={() => onStop(item.id)}>
                    <RotateCcw size={16} />
                    <span>{item.recurrence === "permanente" ? "Desativar" : "Nunca mais"}</span>
                  </button>
                )}
                <button className="ghost-button" type="button" onClick={() => edit(item)}>
                  <Pencil size={16} />
                  <span>Editar</span>
                </button>
                <button className="ghost-button danger-text" type="button" onClick={() => onDelete(item.id)}>
                  <Trash2 size={16} />
                  <span>Remover</span>
                </button>
              </div>
            </article>
          ))}
          {items.length === 0 && <EmptyState text="Cadastre posts, ideias e conteúdos para aparecerem no calendário." />}
        </div>
      </section>
    </div>
  );
}

function MaintenanceManager({
  projects,
  items,
  onSave,
  onDelete,
  onComplete,
  onStop,
  onMissingOrigin,
}: {
  projects: Project[];
  items: MaintenanceItem[];
  onSave: (item: MaintenanceItem) => void;
  onDelete: (itemId: string) => void;
  onComplete: (itemId: string) => void;
  onStop: (itemId: string) => void;
  onMissingOrigin: () => void;
}) {
  const [draft, setDraft] = useState<MaintenanceDraft>({ ...emptyMaintenance, projectId: projects[0]?.id ?? "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const projectName = (projectId: string) => projects.find((project) => project.id === projectId)?.name ?? "Sem projeto";
  const sortedItems = [...items].sort((a, b) => a.date.localeCompare(b.date));

  function edit(item: MaintenanceItem) {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      projectId: item.projectId,
      kind: item.kind,
      date: item.date,
      recurrence: item.recurrence,
      priority: item.priority,
      status: item.status,
      originUrl: item.originUrl,
      notes: item.notes,
      recurrenceStopped: item.recurrenceStopped,
    });
  }

  function reset() {
    setEditingId(null);
    setDraft({ ...emptyMaintenance, projectId: projects[0]?.id ?? "" });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const existing = items.find((item) => item.id === editingId);
    const item: MaintenanceItem = {
      id: existing?.id ?? createId("maintenance"),
      ...draft,
      title: draft.title.trim() || draft.kind,
      projectId: draft.projectId || projects[0]?.id || "",
      recurrenceStopped: draft.recurrence === "nunca mais" ? true : draft.recurrenceStopped,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      completedAt: draft.status === "concluído" ? existing?.completedAt ?? now : undefined,
      sourceId: existing?.sourceId,
    };
    onSave(item);
    reset();
  }

  return (
    <div className="management-screen">
      <section className="form-panel">
        <PanelHeading eyebrow="Manutenção" title={editingId ? "Editar manutenção" : "Nova manutenção"} />
        <form className="data-form" onSubmit={submit}>
          <label>
            Título
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <ProjectSelect value={draft.projectId} projects={projects} onChange={(projectId) => setDraft({ ...draft, projectId })} />
          <label>
            Tipo técnico
            <select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as MaintenanceType })}>
              {maintenanceTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Data
              <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
            </label>
            <label>
              Recorrência
              <RecurrenceSelect value={draft.recurrence} onChange={(recurrence) => setDraft({ ...draft, recurrence })} />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Prioridade
              <PrioritySelect value={draft.priority} onChange={(priority) => setDraft({ ...draft, priority })} />
            </label>
            <label>
              Status
              <TaskStatusSelect value={draft.status} onChange={(status) => setDraft({ ...draft, status })} />
            </label>
          </div>
          <label>
            Link de origem
            <input inputMode="url" value={draft.originUrl} onChange={(event) => setDraft({ ...draft, originUrl: event.target.value })} />
          </label>
          <label>
            Observações
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
          <StopCheckbox checked={draft.recurrenceStopped} onChange={(value) => setDraft({ ...draft, recurrenceStopped: value })} />
          <FormActions editing={Boolean(editingId)} onReset={reset} createLabel="Criar manutenção" />
        </form>
      </section>
      <section className="list-panel">
        <PanelHeading eyebrow="Rotina técnica" title={`${items.length} manutenções`} />
        <div className="event-list">
          {sortedItems.map((item) => {
            const visualStatus = getTaskCalendarStatus(item.status, item.date, item.recurrence, item.recurrenceStopped);
            return (
              <article className={`event-row manutencao ${statusClass(visualStatus)}`} key={item.id}>
                <div className="event-main">
                  <div className="event-title-line">
                    <ServerCog size={16} />
                    <strong>{item.title}</strong>
                  </div>
                  <p>
                    {projectName(item.projectId)} · {formatLongDate(item.date)}
                  </p>
                  <div className="meta-line">
                    <StatusBadge value={visualStatus} compact />
                    <StatusBadge value={item.priority} compact />
                    <span className="meta-chip">{item.kind}</span>
                    <span className="meta-chip">{item.recurrenceStopped ? "nunca mais" : item.recurrence}</span>
                  </div>
                  {item.notes && <p className="notes">{item.notes}</p>}
                </div>
                <div className="row-actions">
                  <OriginButton url={item.originUrl} onMissing={onMissingOrigin} />
                  {item.status !== "concluído" && (
                    <button className="primary-button" type="button" onClick={() => onComplete(item.id)}>
                      <Check size={16} />
                      <span>Concluir</span>
                    </button>
                  )}
                  {!item.recurrenceStopped && !["único", "nunca mais"].includes(item.recurrence) && (
                    <button className="ghost-button danger-text" type="button" onClick={() => onStop(item.id)}>
                      <RotateCcw size={16} />
                      <span>{item.recurrence === "permanente" ? "Desativar" : "Nunca mais"}</span>
                    </button>
                  )}
                  <button className="ghost-button" type="button" onClick={() => edit(item)}>
                    <Pencil size={16} />
                    <span>Editar</span>
                  </button>
                  <button className="ghost-button danger-text" type="button" onClick={() => onDelete(item.id)}>
                    <Trash2 size={16} />
                    <span>Remover</span>
                  </button>
                </div>
              </article>
            );
          })}
          {items.length === 0 && <EmptyState text="Cadastre rotinas técnicas para manter seus projetos saudáveis." />}
        </div>
      </section>
    </div>
  );
}

function FinanceManager({
  projects,
  financeItems,
  stats,
  onSave,
  onDelete,
  onPay,
  onCancel,
  onStop,
  onMissingOrigin,
}: {
  projects: Project[];
  financeItems: FinanceItem[];
  stats: ReturnType<typeof buildFinanceStats>;
  onSave: (item: FinanceItem) => void;
  onDelete: (itemId: string) => void;
  onPay: (itemId: string) => void;
  onCancel: (itemId: string) => void;
  onStop: (itemId: string) => void;
  onMissingOrigin: () => void;
}) {
  const [draft, setDraft] = useState<FinanceDraft>({ ...emptyFinanceItem, projectId: projects[0]?.id ?? "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const projectName = (projectId: string) => projects.find((project) => project.id === projectId)?.name ?? "Sem projeto";
  const sortedItems = [...financeItems].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const financeOverview = useMemo(() => buildFinanceOverview(stats), [stats]);

  function edit(item: FinanceItem) {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      projectId: item.projectId,
      amountBrl: item.amountBrl,
      amountUsd: item.amountUsd,
      dueDate: item.dueDate,
      recurrence: item.recurrence,
      status: item.status,
      originUrl: item.originUrl,
      notes: item.notes,
      recurrenceStopped: item.recurrenceStopped,
    });
  }

  function reset() {
    setEditingId(null);
    setDraft({ ...emptyFinanceItem, projectId: projects[0]?.id ?? "" });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const existing = financeItems.find((item) => item.id === editingId);
    const item: FinanceItem = {
      id: existing?.id ?? createId("finance"),
      ...draft,
      projectId: draft.projectId || projects[0]?.id || "",
      name: draft.name.trim() || "Gasto sem nome",
      amountBrl: Number(draft.amountBrl) || 0,
      amountUsd: Number(draft.amountUsd) || 0,
      recurrenceStopped: draft.recurrence === "nunca mais" ? true : draft.recurrenceStopped,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      paidAt: draft.status === "pago" ? existing?.paidAt ?? now : undefined,
      sourceId: existing?.sourceId,
    };
    onSave(item);
    reset();
  }

  return (
    <div className="finance-screen">
      <section className="finance-dashboard">
        <SummaryCard label="Realizado/Pago" value={formatMoneyPair(financeOverview.paidBrl, financeOverview.paidUsd)} tone="green" />
        <SummaryCard label="Pendente" value={formatMoneyPair(financeOverview.pendingBrl, financeOverview.pendingUsd)} tone="blue" />
        <SummaryCard label="Atrasado" value={formatMoneyPair(financeOverview.overdueBrl, financeOverview.overdueUsd)} tone="red" />
        <SummaryCard label="Previsão mensal" value={formatMoneyPair(stats.monthBrl, stats.monthUsd)} tone="yellow" />
        <SummaryCard label="Previsão anual" value={formatMoneyPair(stats.annualBrl, stats.annualUsd)} tone="blue" />
      </section>

      <section className="chart-panel">
        <PanelHeading eyebrow="Gastos reais cadastrados" title="Últimos 6 meses" icon={<BadgeDollarSign size={22} />} />
        <div className="bar-chart" aria-label="Gráfico de gastos reais cadastrados">
          {stats.chart.map((point) => (
            <div className="bar-column" key={point.label}>
              <div className="bar-stack">
                <span className="bar brl" style={{ height: `${Math.max(6, point.brlPercent)}%` }} />
                <span className="bar usd" style={{ height: `${Math.max(6, point.usdPercent)}%` }} />
              </div>
              <strong>{point.label}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="project-spend-panel">
        <PanelHeading eyebrow="Gastos por projeto" title={`${stats.byProject.length} projetos com custo`} />
        <div className="spend-list">
          {stats.byProject.map((item) => (
            <div className="spend-row" key={item.projectId || item.projectName}>
              <span>{item.projectName}</span>
              <strong>
                {formatCurrency(item.brl, "BRL")} · {formatCurrency(item.usd, "USD")}
              </strong>
            </div>
          ))}
          {stats.byProject.length === 0 && <EmptyState text="Sem gastos ativos cadastrados." />}
        </div>
      </section>

      <div className="management-screen">
        <section className="form-panel">
          <PanelHeading eyebrow="Financeiro" title={editingId ? "Editar gasto" : "Novo gasto"} />
          <form className="data-form" onSubmit={submit}>
            <label>
              Nome
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </label>
            <ProjectSelect value={draft.projectId} projects={projects} onChange={(projectId) => setDraft({ ...draft, projectId })} />
            <div className="form-grid">
              <label>
                Valor em reais
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.amountBrl}
                  onChange={(event) => setDraft({ ...draft, amountBrl: Number(event.target.value) })}
                />
              </label>
              <label>
                Valor em dólares
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.amountUsd}
                  onChange={(event) => setDraft({ ...draft, amountUsd: Number(event.target.value) })}
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Data de vencimento/pagamento
                <input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} />
              </label>
              <label>
                Recorrência
                <RecurrenceSelect value={draft.recurrence} onChange={(recurrence) => setDraft({ ...draft, recurrence })} />
              </label>
            </div>
            <label>
              Status
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as FinanceStatus })}>
                {financeStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Link de origem
              <input inputMode="url" value={draft.originUrl} onChange={(event) => setDraft({ ...draft, originUrl: event.target.value })} />
            </label>
            <label>
              Observações
              <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
            </label>
            <StopCheckbox checked={draft.recurrenceStopped} onChange={(value) => setDraft({ ...draft, recurrenceStopped: value })} />
            <FormActions editing={Boolean(editingId)} onReset={reset} createLabel="Criar gasto" />
          </form>
        </section>

        <section className="list-panel">
          <PanelHeading eyebrow="Itens financeiros" title={`${financeItems.length} itens`} />
          <div className="event-list">
            {sortedItems.map((item) => {
              const visualStatus = getFinanceDisplayStatus(item);
              return (
                <article className={`event-row financeiro ${statusClass(visualStatus)}`} key={item.id}>
                  <div className="event-main">
                    <div className="event-title-line">
                      <BadgeDollarSign size={16} />
                      <strong>{item.name}</strong>
                    </div>
                    <p>
                      {projectName(item.projectId)} · {formatLongDate(item.dueDate)}
                    </p>
                    <div className="meta-line">
                      <StatusBadge value={visualStatus} compact />
                      <span className="meta-chip">{item.recurrenceStopped ? "nunca mais" : item.recurrence}</span>
                      <span className="money-chip">
                        {formatCurrency(item.amountBrl, "BRL")} · {formatCurrency(item.amountUsd, "USD")}
                      </span>
                    </div>
                    {item.notes && <p className="notes">{item.notes}</p>}
                  </div>
                  <div className="row-actions">
                    <OriginButton url={item.originUrl} onMissing={onMissingOrigin} />
                    {item.status !== "pago" && item.status !== "cancelado" && (
                      <button className="primary-button" type="button" onClick={() => onPay(item.id)}>
                        <Check size={16} />
                        <span>Pagar</span>
                      </button>
                    )}
                    {item.status !== "cancelado" && (
                      <button className="ghost-button" type="button" onClick={() => onCancel(item.id)}>
                        <X size={16} />
                        <span>Cancelar</span>
                      </button>
                    )}
                    {!item.recurrenceStopped && !["único", "nunca mais"].includes(item.recurrence) && (
                      <button className="ghost-button danger-text" type="button" onClick={() => onStop(item.id)}>
                        <RotateCcw size={16} />
                        <span>{item.recurrence === "permanente" ? "Desativar" : "Nunca mais"}</span>
                      </button>
                    )}
                    <button className="ghost-button" type="button" onClick={() => edit(item)}>
                      <Pencil size={16} />
                      <span>Editar</span>
                    </button>
                    <button className="ghost-button danger-text" type="button" onClick={() => onDelete(item.id)}>
                      <Trash2 size={16} />
                      <span>Remover</span>
                    </button>
                  </div>
                </article>
              );
            })}
            {financeItems.length === 0 && <EmptyState text="Cadastre gastos para alimentar o financeiro." />}
          </div>
        </section>
      </div>
    </div>
  );
}

function TaskManager({
  projects,
  tasks,
  onSave,
  onDelete,
  onComplete,
  onStop,
  onMissingOrigin,
}: {
  projects: Project[];
  tasks: GeneralTask[];
  onSave: (task: GeneralTask) => void;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onStop: (taskId: string) => void;
  onMissingOrigin: () => void;
}) {
  const [draft, setDraft] = useState<TaskDraft>({ ...emptyTask, projectId: projects[0]?.id ?? "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const projectName = (projectId: string) => projects.find((project) => project.id === projectId)?.name ?? "Sem projeto";
  const sortedTasks = [...tasks].sort((a, b) => a.date.localeCompare(b.date));

  function edit(task: GeneralTask) {
    setEditingId(task.id);
    setDraft({
      title: task.title,
      projectId: task.projectId,
      category: task.category,
      date: task.date,
      priority: task.priority,
      status: task.status,
      recurrence: task.recurrence,
      originUrl: task.originUrl,
      notes: task.notes,
      recurrenceStopped: task.recurrenceStopped,
    });
  }

  function reset() {
    setEditingId(null);
    setDraft({ ...emptyTask, projectId: projects[0]?.id ?? "" });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const existing = tasks.find((task) => task.id === editingId);
    const task: GeneralTask = {
      id: existing?.id ?? createId("task"),
      ...draft,
      title: draft.title.trim() || "Tarefa sem título",
      projectId: draft.projectId || projects[0]?.id || "",
      recurrenceStopped: draft.recurrence === "nunca mais" ? true : draft.recurrenceStopped,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      completedAt: draft.status === "concluído" ? existing?.completedAt ?? now : undefined,
      sourceId: existing?.sourceId,
    };
    onSave(task);
    reset();
  }

  return (
    <div className="management-screen">
      <section className="form-panel">
        <PanelHeading eyebrow="Tarefas gerais" title={editingId ? "Editar tarefa" : "Nova tarefa"} />
        <form className="data-form" onSubmit={submit}>
          <label>
            Título
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <ProjectSelect value={draft.projectId} projects={projects} onChange={(projectId) => setDraft({ ...draft, projectId })} />
          <label>
            Categoria
            <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as TaskCategory })}>
              {taskCategoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Data
              <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
            </label>
            <label>
              Recorrência
              <RecurrenceSelect value={draft.recurrence} onChange={(recurrence) => setDraft({ ...draft, recurrence })} />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Prioridade
              <PrioritySelect value={draft.priority} onChange={(priority) => setDraft({ ...draft, priority })} />
            </label>
            <label>
              Status
              <TaskStatusSelect value={draft.status} onChange={(status) => setDraft({ ...draft, status })} />
            </label>
          </div>
          <label>
            Link de origem
            <input inputMode="url" value={draft.originUrl} onChange={(event) => setDraft({ ...draft, originUrl: event.target.value })} />
          </label>
          <label>
            Observações
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
          <StopCheckbox checked={draft.recurrenceStopped} onChange={(value) => setDraft({ ...draft, recurrenceStopped: value })} />
          <FormActions editing={Boolean(editingId)} onReset={reset} createLabel="Criar tarefa" />
        </form>
      </section>
      <section className="list-panel">
        <PanelHeading eyebrow="Tarefas" title={`${tasks.length} itens`} />
        <div className="event-list">
          {sortedTasks.map((task) => {
            const visualStatus = getTaskCalendarStatus(task.status, task.date, task.recurrence, task.recurrenceStopped);
            return (
              <article className={`event-row tarefa ${statusClass(visualStatus)}`} key={task.id}>
                <div className="event-main">
                  <div className="event-title-line">
                    <ListChecks size={16} />
                    <strong>{task.title}</strong>
                  </div>
                  <p>
                    {projectName(task.projectId)} · {formatLongDate(task.date)}
                  </p>
                  <div className="meta-line">
                    <StatusBadge value={visualStatus} compact />
                    <StatusBadge value={task.priority} compact />
                    <span className="meta-chip">{task.category}</span>
                    <span className="meta-chip">{task.recurrenceStopped ? "nunca mais" : task.recurrence}</span>
                  </div>
                  {task.notes && <p className="notes">{task.notes}</p>}
                </div>
                <div className="row-actions">
                  <OriginButton url={task.originUrl} onMissing={onMissingOrigin} />
                  {task.status !== "concluído" && (
                    <button className="primary-button" type="button" onClick={() => onComplete(task.id)}>
                      <Check size={16} />
                      <span>Concluir</span>
                    </button>
                  )}
                  {!task.recurrenceStopped && !["único", "nunca mais"].includes(task.recurrence) && (
                    <button className="ghost-button danger-text" type="button" onClick={() => onStop(task.id)}>
                      <RotateCcw size={16} />
                      <span>{task.recurrence === "permanente" ? "Desativar" : "Nunca mais"}</span>
                    </button>
                  )}
                  <button className="ghost-button" type="button" onClick={() => edit(task)}>
                    <Pencil size={16} />
                    <span>Editar</span>
                  </button>
                  <button className="ghost-button danger-text" type="button" onClick={() => onDelete(task.id)}>
                    <Trash2 size={16} />
                    <span>Remover</span>
                  </button>
                </div>
              </article>
            );
          })}
          {tasks.length === 0 && <EmptyState text="Cadastre tarefas gerais separadas de conteúdo, manutenção e financeiro." />}
        </div>
      </section>
    </div>
  );
}

function ReminderManager({
  projects,
  reminders,
  onSave,
  onDelete,
  onComplete,
  onIgnore,
  onStop,
  onMissingOrigin,
}: {
  projects: Project[];
  reminders: Reminder[];
  onSave: (reminder: Reminder) => void;
  onDelete: (reminderId: string) => void;
  onComplete: (reminderId: string) => void;
  onIgnore: (reminderId: string) => void;
  onStop: (event: CalendarEvent) => void;
  onMissingOrigin: () => void;
}) {
  const [draft, setDraft] = useState<ReminderDraft>({ ...emptyReminder, projectId: projects[0]?.id ?? "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const projectName = (projectId: string) => projects.find((project) => project.id === projectId)?.name ?? "Sem projeto";
  const sortedReminders = [...reminders].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  function edit(reminder: Reminder) {
    setEditingId(reminder.id);
    setDraft({
      title: reminder.title,
      projectId: reminder.projectId,
      dueDate: reminder.dueDate,
      type: reminder.type,
      recurrence: reminder.recurrence,
      priority: reminder.priority,
      status: reminder.status,
      notes: reminder.notes,
      originUrl: reminder.originUrl,
      recurrenceStopped: reminder.recurrenceStopped,
    });
  }

  function reset() {
    setEditingId(null);
    setDraft({ ...emptyReminder, projectId: projects[0]?.id ?? "" });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const existing = reminders.find((reminder) => reminder.id === editingId);
    const reminder: Reminder = {
      id: existing?.id ?? createId("reminder"),
      ...draft,
      projectId: draft.projectId || projects[0]?.id || "",
      title: draft.title.trim() || "Lembrete sem título",
      recurrenceStopped: draft.recurrence === "nunca mais" ? true : draft.recurrenceStopped,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      completedAt: draft.status === "concluído" ? existing?.completedAt ?? now : undefined,
      sourceId: existing?.sourceId,
    };
    onSave(reminder);
    reset();
  }

  return (
    <div className="management-screen">
      <section className="form-panel">
        <PanelHeading eyebrow="Renovações e lembretes" title={editingId ? "Editar lembrete" : "Novo lembrete"} />
        <form className="data-form" onSubmit={submit}>
          <label>
            Título
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <ProjectSelect value={draft.projectId} projects={projects} onChange={(projectId) => setDraft({ ...draft, projectId })} />
          <div className="form-grid">
            <label>
              Tipo
              <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ReminderType })}>
                {reminderTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ReminderStatus })}>
                {reminderStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label>
              Data
              <input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} />
            </label>
            <label>
              Recorrência
              <RecurrenceSelect value={draft.recurrence} onChange={(recurrence) => setDraft({ ...draft, recurrence })} />
            </label>
          </div>
          <label>
            Prioridade
            <PrioritySelect value={draft.priority} onChange={(priority) => setDraft({ ...draft, priority })} />
          </label>
          <label>
            Link de origem
            <input inputMode="url" value={draft.originUrl} onChange={(event) => setDraft({ ...draft, originUrl: event.target.value })} />
          </label>
          <label>
            Observações
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
          <StopCheckbox checked={draft.recurrenceStopped} onChange={(value) => setDraft({ ...draft, recurrenceStopped: value })} />
          <FormActions editing={Boolean(editingId)} onReset={reset} createLabel="Criar lembrete" />
        </form>
      </section>
      <section className="list-panel">
        <PanelHeading eyebrow="Renovações e lembretes" title={`${reminders.length} itens`} />
        <div className="event-list">
          {sortedReminders.map((reminder) => {
            const visualStatus = getReminderCalendarStatus(reminder);
            const event = reminderToEvent(reminder, projectName(reminder.projectId));
            return (
              <article className={`event-row ${statusClass(event.kind)} ${statusClass(visualStatus)}`} key={reminder.id}>
                <div className="event-main">
                  <div className="event-title-line">
                    <ClipboardCheck size={16} />
                    <strong>{reminder.title}</strong>
                  </div>
                  <p>
                    {projectName(reminder.projectId)} · {formatLongDate(reminder.dueDate)}
                  </p>
                  <div className="meta-line">
                    <StatusBadge value={visualStatus} compact />
                    <StatusBadge value={reminder.priority} compact />
                    <span className="meta-chip">{reminder.type}</span>
                    <span className="meta-chip">{reminder.recurrenceStopped ? "nunca mais" : reminder.recurrence}</span>
                  </div>
                  {reminder.notes && <p className="notes">{reminder.notes}</p>}
                </div>
                <div className="row-actions">
                  <OriginButton url={reminder.originUrl} onMissing={onMissingOrigin} />
                  {reminder.status !== "concluído" && (
                    <button className="primary-button" type="button" onClick={() => onComplete(reminder.id)}>
                      <Check size={16} />
                      <span>Concluir</span>
                    </button>
                  )}
                  {reminder.status === "pendente" && (
                    <button className="ghost-button" type="button" onClick={() => onIgnore(reminder.id)}>
                      <Ban size={16} />
                      <span>Ignorar</span>
                    </button>
                  )}
                  {!reminder.recurrenceStopped && !["único", "nunca mais"].includes(reminder.recurrence) && (
                    <button className="ghost-button danger-text" type="button" onClick={() => onStop(event)}>
                      <RotateCcw size={16} />
                      <span>{reminder.recurrence === "permanente" ? "Desativar" : "Nunca mais"}</span>
                    </button>
                  )}
                  <button className="ghost-button" type="button" onClick={() => edit(reminder)}>
                    <Pencil size={16} />
                    <span>Editar</span>
                  </button>
                  <button className="ghost-button danger-text" type="button" onClick={() => onDelete(reminder.id)}>
                    <Trash2 size={16} />
                    <span>Remover</span>
                  </button>
                </div>
              </article>
            );
          })}
          {reminders.length === 0 && <EmptyState text="Cadastre renovações e lembretes para alimentar o calendário." />}
        </div>
      </section>
    </div>
  );
}

function PanelHeading({
  eyebrow,
  title,
  icon,
  className = "",
}: {
  eyebrow: string;
  title: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel-heading ${className}`}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {icon}
    </div>
  );
}

function DashboardPanel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="dashboard-panel">
      <PanelHeading eyebrow={eyebrow} title={title} />
      {children}
    </section>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className={`summary-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProjectSelect({
  value,
  projects,
  onChange,
}: {
  value: string;
  projects: Project[];
  onChange: (projectId: string) => void;
}) {
  return (
    <label>
      Projeto relacionado
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={projects.length === 0}>
        {projects.length === 0 && <option value="">Sem projetos</option>}
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PrioritySelect({ value, onChange }: { value: Priority; onChange: (priority: Priority) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as Priority)}>
      {priorityOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function RecurrenceSelect({ value, onChange }: { value: Recurrence; onChange: (recurrence: Recurrence) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as Recurrence)}>
      {recurrenceOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function TaskStatusSelect({ value, onChange }: { value: TaskStatus; onChange: (status: TaskStatus) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as TaskStatus)}>
      {taskStatusOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function StopCheckbox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="checkbox-line">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      Parar recorrência para sempre
    </label>
  );
}

function FormActions({ editing, onReset, createLabel }: { editing: boolean; onReset: () => void; createLabel: string }) {
  return (
    <div className="button-row">
      <button className="primary-button" type="submit">
        <Save size={16} />
        <span>{editing ? "Salvar alterações" : createLabel}</span>
      </button>
      {editing && (
        <button className="ghost-button" type="button" onClick={onReset}>
          <X size={16} />
          <span>Cancelar</span>
        </button>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="empty-state">{text}</p>;
}

function buildCalendarEvents(data: AppData, projectNameById: Map<string, string>) {
  const projectName = (projectId: string) => projectNameById.get(projectId) ?? "Sem projeto";
  const reminderEvents = data.reminders.map((reminder) => reminderToEvent(reminder, projectName(reminder.projectId)));
  const contentEvents = data.contentItems.map((item): CalendarEvent => ({
    id: item.id,
    kind: "conteúdo",
    title: item.title,
    projectId: item.projectId,
    projectName: projectName(item.projectId),
    date: item.postDate,
    recurrence: item.recurrence,
    recurrenceStopped: item.recurrenceStopped,
    priority: item.priority,
    status: getContentCalendarStatus(item),
    rawStatus: item.status,
    originUrl: item.assetUrl,
    platform: item.platform,
    type: item.type,
  }));
  const maintenanceEvents = data.maintenanceItems.map((item): CalendarEvent => ({
    id: item.id,
    kind: "manutenção",
    title: item.title,
    projectId: item.projectId,
    projectName: projectName(item.projectId),
    date: item.date,
    recurrence: item.recurrence,
    recurrenceStopped: item.recurrenceStopped,
    priority: item.priority,
    status: getTaskCalendarStatus(item.status, item.date, item.recurrence, item.recurrenceStopped),
    rawStatus: item.status,
    originUrl: item.originUrl,
    type: item.kind,
  }));
  const financeEvents = data.financeItems.map((item): CalendarEvent => ({
    id: item.id,
    kind: "financeiro",
    title: item.name,
    projectId: item.projectId,
    projectName: projectName(item.projectId),
    date: item.dueDate,
    recurrence: item.recurrence,
    recurrenceStopped: item.recurrenceStopped,
    status: getFinanceCalendarStatus(item),
    rawStatus: item.status,
    originUrl: item.originUrl,
    amountBrl: item.amountBrl,
    amountUsd: item.amountUsd,
  }));
  const taskEvents = data.generalTasks.map((item): CalendarEvent => ({
    id: item.id,
    kind: "tarefa",
    title: item.title,
    projectId: item.projectId,
    projectName: projectName(item.projectId),
    date: item.date,
    recurrence: item.recurrence,
    recurrenceStopped: item.recurrenceStopped,
    priority: item.priority,
    status: getTaskCalendarStatus(item.status, item.date, item.recurrence, item.recurrenceStopped),
    rawStatus: item.status,
    originUrl: item.originUrl,
    type: item.category,
  }));

  return [...reminderEvents, ...contentEvents, ...maintenanceEvents, ...financeEvents, ...taskEvents].sort(sortByDate);
}

function reminderToEvent(reminder: Reminder, projectName: string): CalendarEvent {
  return {
    id: reminder.id,
    kind: reminder.type === "renovação" ? "renovação" : "lembrete",
    title: reminder.title,
    projectId: reminder.projectId,
    projectName,
    date: reminder.dueDate,
    recurrence: reminder.recurrence,
    recurrenceStopped: reminder.recurrenceStopped,
    priority: reminder.priority,
    status: getReminderCalendarStatus(reminder),
    rawStatus: reminder.status,
    originUrl: reminder.originUrl,
    type: reminder.type,
  };
}

function applyCalendarFilters(events: CalendarEvent[], filters: CalendarFilters) {
  return events.filter((event) => {
    if (filters.projectId !== "todos" && event.projectId !== filters.projectId) return false;
    if (filters.category !== "todos" && event.kind !== filters.category) return false;
    if (filters.status !== "todos" && event.status !== filters.status && event.rawStatus !== filters.status) return false;
    if (filters.priority !== "todos" && event.priority !== filters.priority) return false;
    if (filters.date && event.date !== filters.date) return false;
    if (filters.platform !== "todos" && event.platform !== filters.platform) return false;
    if (filters.recurrence !== "todos" && event.recurrence !== filters.recurrence) return false;
    return true;
  });
}

function buildTodayFocusEvents(events: CalendarEvent[]) {
  return events
    .filter((event) => !isEventDone(event))
    .filter((event) => event.status === "atrasado" || event.priority === "crítica" || event.priority === "alta" || event.date >= todayKey())
    .sort((a, b) => focusScore(a) - focusScore(b) || a.date.localeCompare(b.date))
    .slice(0, 6);
}

function focusScore(event: CalendarEvent) {
  if (event.status === "atrasado") return 0;
  if (event.priority === "crítica") return 1;
  if (event.priority === "alta") return 2;
  if (event.date === todayKey() || isAlwaysVisible(event)) return 3;
  return 4;
}

function describeActiveFilters(filters: CalendarFilters, projects: Project[]) {
  const labels: string[] = [];
  if (filters.projectId !== "todos") labels.push(projects.find((project) => project.id === filters.projectId)?.name ?? "Projeto filtrado");
  if (filters.category !== "todos") labels.push(`Categoria: ${filters.category}`);
  if (filters.status !== "todos") labels.push(`Status: ${filters.status}`);
  if (filters.priority !== "todos") labels.push(`Prioridade: ${filters.priority}`);
  if (filters.date) labels.push(`Data: ${formatShortDate(filters.date)}`);
  if (filters.platform !== "todos") labels.push(`Plataforma: ${filters.platform}`);
  if (filters.recurrence !== "todos") labels.push(`Recorrência: ${filters.recurrence}`);
  return labels;
}

function getReminderCalendarStatus(reminder: Reminder): CalendarStatus {
  if (reminder.recurrence === "permanente" && !reminder.recurrenceStopped) return "permanente";
  if (reminder.status === "concluído" || reminder.status === "ignorado") return "concluído";
  if (reminder.status === "atrasado" || diffInDays(reminder.dueDate) < 0) return "atrasado";
  if (diffInDays(reminder.dueDate) <= 7) return "vencendo";
  return "pendente";
}

function getContentCalendarStatus(item: ContentItem): CalendarStatus {
  if (item.recurrence === "permanente" && !item.recurrenceStopped) return "permanente";
  if (item.status === "publicado") return "publicado";
  if (diffInDays(item.postDate) < 0) return "atrasado";
  return item.status;
}

function getTaskCalendarStatus(status: TaskStatus, date: string, recurrence: Recurrence, recurrenceStopped: boolean): CalendarStatus {
  if (recurrence === "permanente" && !recurrenceStopped) return "permanente";
  if (status === "concluído") return "concluído";
  if (status === "cancelado") return "cancelado";
  if (status === "atrasado" || diffInDays(date) < 0) return "atrasado";
  if (status === "em andamento") return "em andamento";
  if (diffInDays(date) <= 7) return "vencendo";
  return "pendente";
}

function getFinanceCalendarStatus(item: FinanceItem): CalendarStatus {
  if (item.recurrence === "permanente" && !item.recurrenceStopped) return "permanente";
  if (item.status === "pago") return "pago";
  if (item.status === "cancelado") return "cancelado";
  if (item.status === "atrasado" || diffInDays(item.dueDate) < 0) return "atrasado";
  if (diffInDays(item.dueDate) <= 7) return "vencendo";
  return "pendente";
}

function getFinanceDisplayStatus(item: FinanceItem): FinanceStatus {
  if (item.status === "pendente" && diffInDays(item.dueDate) < 0) return "atrasado";
  return item.status;
}

function isEventDone(event: CalendarEvent) {
  return ["concluído", "publicado", "pago", "cancelado"].includes(event.status);
}

function isAlwaysVisible(event: CalendarEvent) {
  return event.status === "permanente" && !event.recurrenceStopped;
}

function shouldCreateNext(recurrence: Recurrence, recurrenceStopped: boolean) {
  return !recurrenceStopped && !["único", "permanente", "nunca mais"].includes(recurrence);
}

function hasDuplicateReminderOccurrence(items: Reminder[], original: Reminder, nextDate: string) {
  return items.some(
    (item) =>
      item.id !== original.id &&
      item.projectId === original.projectId &&
      item.type === original.type &&
      item.dueDate === nextDate &&
      sameRecurrenceChain(item, original),
  );
}

function hasDuplicateContentOccurrence(items: ContentItem[], original: ContentItem, nextDate: string) {
  return items.some(
    (item) =>
      item.id !== original.id &&
      item.projectId === original.projectId &&
      item.platform === original.platform &&
      item.type === original.type &&
      item.postDate === nextDate &&
      sameRecurrenceChain(item, original),
  );
}

function hasDuplicateMaintenanceOccurrence(items: MaintenanceItem[], original: MaintenanceItem, nextDate: string) {
  return items.some(
    (item) =>
      item.id !== original.id &&
      item.projectId === original.projectId &&
      item.kind === original.kind &&
      item.date === nextDate &&
      sameRecurrenceChain(item, original),
  );
}

function hasDuplicateFinanceOccurrence(items: FinanceItem[], original: FinanceItem, nextDate: string) {
  return items.some(
    (item) =>
      item.id !== original.id &&
      item.projectId === original.projectId &&
      item.name === original.name &&
      item.dueDate === nextDate &&
      sameRecurrenceChain(item, original),
  );
}

function hasDuplicateTaskOccurrence(items: GeneralTask[], original: GeneralTask, nextDate: string) {
  return items.some(
    (item) =>
      item.id !== original.id &&
      item.projectId === original.projectId &&
      item.category === original.category &&
      item.title === original.title &&
      item.date === nextDate &&
      sameRecurrenceChain(item, original),
  );
}

function sameRecurrenceChain(current: { id: string; sourceId?: string }, original: { id: string; sourceId?: string }) {
  const originalRoot = original.sourceId ?? original.id;
  const currentRoot = current.sourceId ?? current.id;
  return currentRoot === originalRoot || current.sourceId === original.id || original.sourceId === current.id;
}

function buildFinanceStats(financeItems: FinanceItem[], projects: Project[]) {
  const activeItems = financeItems.filter((item) => item.status !== "cancelado");
  const paidHistory = activeItems.filter((item) => item.status === "pago");
  const upcomingPayments = activeItems.filter((item) => item.status === "pendente" || item.status === "atrasado");
  const recurringObligations = buildRecurringFinanceObligations(activeItems);
  const currentMonth = monthKey(todayKey());
  const currentYear = todayKey().slice(0, 4);
  const monthItems = activeItems.filter((item) => monthKey(item.dueDate) === currentMonth);
  const oneTimeAnnualItems = activeItems.filter(
    (item) => (item.recurrence === "único" || item.recurrence === "nunca mais") && item.dueDate.startsWith(currentYear),
  );

  const monthBrl = sum(monthItems.map((item) => item.amountBrl));
  const monthUsd = sum(monthItems.map((item) => item.amountUsd));
  const annualBrl =
    sum(oneTimeAnnualItems.map((item) => item.amountBrl)) +
    sum(recurringObligations.map((item) => item.amountBrl * recurrenceMultiplier(item.recurrence)));
  const annualUsd =
    sum(oneTimeAnnualItems.map((item) => item.amountUsd)) +
    sum(recurringObligations.map((item) => item.amountUsd * recurrenceMultiplier(item.recurrence)));

  const byProjectMap = new Map<string, { projectId: string; projectName: string; brl: number; usd: number }>();
  for (const item of activeItems) {
    const projectName = projects.find((project) => project.id === item.projectId)?.name ?? "Sem projeto";
    const current = byProjectMap.get(item.projectId || projectName) ?? { projectId: item.projectId, projectName, brl: 0, usd: 0 };
    current.brl += item.amountBrl;
    current.usd += item.amountUsd;
    byProjectMap.set(item.projectId || projectName, current);
  }

  const months = Array.from({ length: 6 }, (_, index) => monthKey(addMonths(todayKey(), index - 5)));
  const rawChart = months.map((key) => {
    const items = activeItems.filter((item) => monthKey(item.dueDate) === key);
    return {
      label: key.slice(5),
      brl: sum(items.map((item) => item.amountBrl)),
      usd: sum(items.map((item) => item.amountUsd)),
    };
  });
  const maxBrl = Math.max(1, ...rawChart.map((point) => point.brl));
  const maxUsd = Math.max(1, ...rawChart.map((point) => point.usd));

  return {
    monthBrl,
    monthUsd,
    annualBrl,
    annualUsd,
    paidHistory,
    recurringObligations,
    upcomingPayments,
    byProject: [...byProjectMap.values()].sort((a, b) => b.brl + b.usd - (a.brl + a.usd)),
    chart: rawChart.map((point) => ({
      ...point,
      brlPercent: (point.brl / maxBrl) * 100,
      usdPercent: (point.usd / maxUsd) * 100,
    })),
  };
}

function buildRecurringFinanceObligations(items: FinanceItem[]) {
  const obligations = new Map<string, FinanceItem>();

  for (const item of items) {
    if (item.recurrenceStopped) continue;
    if (!["pendente", "atrasado"].includes(item.status)) continue;
    if (["único", "permanente", "nunca mais"].includes(item.recurrence)) continue;

    const key = [
      item.sourceId ?? item.id,
      item.projectId,
      item.name.trim().toLowerCase(),
      item.recurrence,
      item.amountBrl,
      item.amountUsd,
    ].join("|");
    const current = obligations.get(key);

    if (!current || item.dueDate < current.dueDate) {
      obligations.set(key, item);
    }
  }

  return [...obligations.values()];
}

function buildFinanceOverview(stats: ReturnType<typeof buildFinanceStats>) {
  const paidThisMonth = stats.paidHistory.filter((item) => monthKey(item.dueDate) === monthKey(todayKey()));
  const pendingItems = stats.upcomingPayments.filter((item) => item.status === "pendente" && diffInDays(item.dueDate) >= 0);
  const overdueItems = stats.upcomingPayments.filter((item) => item.status === "atrasado" || diffInDays(item.dueDate) < 0);

  return {
    paidBrl: sum(paidThisMonth.map((item) => item.amountBrl)),
    paidUsd: sum(paidThisMonth.map((item) => item.amountUsd)),
    pendingBrl: sum(pendingItems.map((item) => item.amountBrl)),
    pendingUsd: sum(pendingItems.map((item) => item.amountUsd)),
    overdueBrl: sum(overdueItems.map((item) => item.amountBrl)),
    overdueUsd: sum(overdueItems.map((item) => item.amountUsd)),
  };
}

function buildTaskBuckets(tasks: GeneralTask[]) {
  const buckets = new Map<TaskCategory, number>();
  for (const task of tasks) {
    if (task.status === "concluído" || task.status === "cancelado") continue;
    buckets.set(task.category, (buckets.get(task.category) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

function recurrenceMultiplier(recurrence: Recurrence) {
  if (recurrence === "diário") return 365;
  if (recurrence === "semanal") return 52;
  if (recurrence === "mensal") return 12;
  if (recurrence === "anual" || recurrence === "único" || recurrence === "nunca mais") return 1;
  return 0;
}

function eventIcon(kind: CalendarCategory, size: number) {
  if (kind === "conteúdo") return <Megaphone size={size} />;
  if (kind === "manutenção") return <ServerCog size={size} />;
  if (kind === "financeiro") return <BadgeDollarSign size={size} />;
  if (kind === "renovação") return <RotateCcw size={size} />;
  if (kind === "tarefa") return <ListChecks size={size} />;
  return <ClipboardCheck size={size} />;
}

function sortByDate(a: CalendarEvent, b: CalendarEvent) {
  return a.date.localeCompare(b.date);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function formatCurrency(value: number, currency: "BRL" | "USD") {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatMoneyPair(amountBrl: number, amountUsd: number) {
  return `${formatCurrency(amountBrl, "BRL")} · ${formatCurrency(amountUsd, "USD")}`;
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function quickTitleFallback(kind: QuickKind) {
  if (kind === "conteúdo") return "Conteúdo sem título";
  if (kind === "manutenção") return "Manutenção sem título";
  if (kind === "financeiro") return "Gasto sem nome";
  if (kind === "renovação") return "Renovação sem título";
  return "Tarefa sem título";
}

function statusClass(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseDateDay(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).getDay();
}
