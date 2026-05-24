import type {
  AppData,
  ContentItem,
  FinanceItem,
  GeneralTask,
  MaintenanceItem,
  Project,
  Reminder,
} from "../types";
import { addDays, todayKey } from "./dates";

const storageKey = "painel-manutencao-projetos:v1";
const currentSchemaVersion = 3;

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function seedData(): AppData {
  const today = todayKey();
  const now = new Date().toISOString();

  return {
    schemaVersion: currentSchemaVersion,
    projects: [],
    reminders: [],
    contentItems: createDefaultContentSchedule(today, now),
    maintenanceItems: [],
    financeItems: [],
    generalTasks: [],
  };
}

function createDefaultContentSchedule(today: string, now: string): ContentItem[] {
  const schedule = [
    { title: "Post de segunda-feira", weekday: 1, type: "post comum" },
    { title: "Story de terça-feira", weekday: 2, type: "story" },
    { title: "Post de quarta-feira", weekday: 3, type: "post comum" },
    { title: "Story de quinta-feira", weekday: 4, type: "story" },
    { title: "Post de sexta-feira", weekday: 5, type: "post comum" },
  ] as const;

  return schedule.map((item) => ({
    id: id("content"),
    title: item.title,
    projectId: "",
    platform: "Instagram",
    type: item.type,
    status: "agendado",
    postDate: nextDateForWeekday(today, item.weekday),
    priority: "média",
    caption: "",
    assetUrl: "",
    notes: "",
    recurrence: "semanal",
    recurrenceStopped: false,
    createdAt: now,
    updatedAt: now,
  }));
}

function nextDateForWeekday(dateKey: string, weekday: number) {
  const day = dayOfWeek(dateKey);
  return addDays(dateKey, (weekday - day + 7) % 7);
}

function dayOfWeek(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function loadData(): AppData {
  const stored = localStorage.getItem(storageKey);
  if (!stored) {
    const seeded = seedData();
    saveData(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<AppData>;
    return migrateData(parsed);
  } catch {
    const seeded = seedData();
    saveData(seeded);
    return seeded;
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(storageKey, JSON.stringify({ ...data, schemaVersion: currentSchemaVersion }));
}

function migrateData(parsed: Partial<AppData>): AppData {
  const now = new Date().toISOString();
  let projects = (parsed.projects ?? []).map((project) => normalizeProject(project, now));
  let reminders = (parsed.reminders ?? []).map((reminder) => normalizeReminder(reminder, now));
  let contentItems = (parsed.contentItems ?? []).map((item) => normalizeContent(item, now));
  let maintenanceItems = (parsed.maintenanceItems ?? []).map((item) => normalizeMaintenance(item, now));
  let financeItems = (parsed.financeItems ?? []).map((item) => normalizeFinance(item, now));
  let generalTasks = (parsed.generalTasks ?? []).map((task) => normalizeTask(task, now));
  const schemaVersion = parsed.schemaVersion ?? 1;

  if (schemaVersion < 2) {
    const technicalReminders = reminders.filter(isTechnicalReminder);
    const existingKeys = new Set(maintenanceItems.map(maintenanceMigrationKey));
    const migratedMaintenance = technicalReminders
      .map((reminder) => reminderToMaintenance(reminder, now))
      .filter((item) => {
        const key = maintenanceMigrationKey(item);
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });

    maintenanceItems = [...maintenanceItems, ...migratedMaintenance];
    reminders = reminders.filter((reminder) => !isTechnicalReminder(reminder));
  }

  if (schemaVersion < 3) {
    projects = projects.filter((project) => !isDemoProject(project));
    reminders = reminders.filter((reminder) => !isDemoReminder(reminder));
    contentItems = contentItems.filter((item) => !isDemoContent(item));
    maintenanceItems = maintenanceItems.filter((item) => !isDemoMaintenance(item));
    financeItems = financeItems.filter((item) => !isDemoFinance(item));
    generalTasks = generalTasks.filter((task) => !isDemoTask(task));

    contentItems = addMissingDefaultContentSchedule(contentItems, now);
  }

  return {
    schemaVersion: currentSchemaVersion,
    projects,
    reminders,
    contentItems,
    maintenanceItems,
    financeItems,
    generalTasks,
  };
}

function normalizeProject(project: Project, now: string): Project {
  return {
    id: project.id ?? id("project"),
    name: project.name ?? "Projeto sem nome",
    siteUrl: project.siteUrl ?? "",
    description: project.description ?? "",
    platform: project.platform ?? "Outro",
    status: project.status ?? "ativo",
    notes: project.notes ?? "",
    adminUrl: project.adminUrl ?? "",
    createdAt: project.createdAt ?? now,
    updatedAt: project.updatedAt ?? now,
  };
}

function normalizeReminder(reminder: Reminder, now: string): Reminder {
  return {
    id: reminder.id ?? id("reminder"),
    title: reminder.title ?? "Lembrete sem título",
    projectId: reminder.projectId ?? "",
    dueDate: reminder.dueDate ?? todayKey(),
    type: reminder.type ?? "outro",
    recurrence: reminder.recurrence ?? "único",
    priority: reminder.priority ?? "média",
    status: reminder.status ?? "pendente",
    notes: reminder.notes ?? "",
    originUrl: reminder.originUrl ?? "",
    recurrenceStopped: Boolean(reminder.recurrenceStopped),
    sourceId: reminder.sourceId,
    createdAt: reminder.createdAt ?? now,
    updatedAt: reminder.updatedAt ?? now,
    completedAt: reminder.completedAt,
  };
}

function normalizeContent(item: ContentItem, now: string): ContentItem {
  return {
    id: item.id ?? id("content"),
    title: item.title ?? "Conteúdo sem título",
    projectId: item.projectId ?? "",
    platform: item.platform ?? "Outro",
    type: item.type ?? "outro",
    status: item.status ?? "ideia",
    postDate: item.postDate ?? todayKey(),
    priority: item.priority ?? "média",
    caption: item.caption ?? "",
    assetUrl: item.assetUrl ?? "",
    notes: item.notes ?? "",
    recurrence: item.recurrence ?? "único",
    recurrenceStopped: Boolean(item.recurrenceStopped),
    sourceId: item.sourceId,
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
    publishedAt: item.publishedAt,
  };
}

function normalizeMaintenance(item: MaintenanceItem, now: string): MaintenanceItem {
  return {
    id: item.id ?? id("maintenance"),
    title: item.title ?? "Manutenção sem título",
    projectId: item.projectId ?? "",
    kind: item.kind ?? "Outro",
    date: item.date ?? todayKey(),
    recurrence: item.recurrence ?? "único",
    priority: item.priority ?? "média",
    status: item.status ?? "pendente",
    originUrl: item.originUrl ?? "",
    notes: item.notes ?? "",
    recurrenceStopped: Boolean(item.recurrenceStopped),
    sourceId: item.sourceId,
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
    completedAt: item.completedAt,
  };
}

function normalizeFinance(item: FinanceItem, now: string): FinanceItem {
  return {
    id: item.id ?? id("finance"),
    name: item.name ?? "Gasto sem nome",
    projectId: item.projectId ?? "",
    amountBrl: Number(item.amountBrl) || 0,
    amountUsd: Number(item.amountUsd) || 0,
    dueDate: item.dueDate ?? todayKey(),
    recurrence: item.recurrence ?? "mensal",
    status: item.status ?? "pendente",
    originUrl: item.originUrl ?? "",
    notes: item.notes ?? "",
    recurrenceStopped: Boolean(item.recurrenceStopped),
    sourceId: item.sourceId,
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
    paidAt: item.paidAt,
  };
}

function normalizeTask(task: GeneralTask, now: string): GeneralTask {
  return {
    id: task.id ?? id("task"),
    title: task.title ?? "Tarefa sem título",
    projectId: task.projectId ?? "",
    category: task.category ?? "outro",
    date: task.date ?? todayKey(),
    priority: task.priority ?? "média",
    status: task.status ?? "pendente",
    recurrence: task.recurrence ?? "único",
    originUrl: task.originUrl ?? "",
    notes: task.notes ?? "",
    recurrenceStopped: Boolean(task.recurrenceStopped),
    sourceId: task.sourceId,
    createdAt: task.createdAt ?? now,
    updatedAt: task.updatedAt ?? now,
    completedAt: task.completedAt,
  };
}

const defaultContentTitles = new Set([
  "Post de segunda-feira",
  "Story de terça-feira",
  "Post de quarta-feira",
  "Story de quinta-feira",
  "Post de sexta-feira",
]);

const demoProjectNames = new Set(["Site institucional", "Sistema de assinaturas", "Domínio principal"]);
const demoReminderTitles = new Set(["Renovar domínio", "Entrega de revisão mensal"]);
const demoContentTitles = new Set(["Post de bastidores do projeto", "Vídeo explicando cobrança recorrente"]);
const demoMaintenanceTitles = new Set(["Verificar deploy e domínio", "Backup de banco"]);
const demoFinanceNames = new Set(["Hospedagem Vercel", "Domínio .com.br", "Ferramenta de testes"]);
const demoTaskTitles = new Set(["Revisar ideias de melhorias", "Organizar próximos experimentos"]);

function addMissingDefaultContentSchedule(items: ContentItem[], now: string) {
  const existingTitles = new Set(items.map((item) => item.title));
  const missingItems = createDefaultContentSchedule(todayKey(), now).filter((item) => !existingTitles.has(item.title));
  return [...items, ...missingItems];
}

function isDemoProject(project: Project) {
  return demoProjectNames.has(project.name) || project.siteUrl === "https://example.com";
}

function isDemoReminder(reminder: Reminder) {
  return demoReminderTitles.has(reminder.title);
}

function isDemoContent(item: ContentItem) {
  return demoContentTitles.has(item.title) && !defaultContentTitles.has(item.title);
}

function isDemoMaintenance(item: MaintenanceItem) {
  return demoMaintenanceTitles.has(item.title);
}

function isDemoFinance(item: FinanceItem) {
  return demoFinanceNames.has(item.name);
}

function isDemoTask(task: GeneralTask) {
  return demoTaskTitles.has(task.title);
}

function isTechnicalReminder(reminder: Reminder) {
  return ["manutenção", "backup", "verificação"].includes(reminder.type);
}

function reminderToMaintenance(reminder: Reminder, now: string): MaintenanceItem {
  return {
    id: id("maintenance"),
    title: reminder.title,
    projectId: reminder.projectId,
    kind: reminder.type === "backup" ? "Fazer backup" : reminder.type === "verificação" ? "Verificar site online" : "Atualizar projeto",
    date: reminder.dueDate,
    recurrence: reminder.recurrence,
    priority: reminder.priority,
    status: reminder.status === "ignorado" ? "cancelado" : reminder.status === "concluído" ? "concluído" : reminder.status,
    originUrl: reminder.originUrl,
    notes: reminder.notes,
    recurrenceStopped: reminder.recurrenceStopped,
    sourceId: reminder.sourceId ?? reminder.id,
    createdAt: reminder.createdAt ?? now,
    updatedAt: now,
    completedAt: reminder.completedAt,
  };
}

function maintenanceMigrationKey(item: MaintenanceItem) {
  return [item.sourceId ?? item.id, item.projectId, item.kind, item.date].join("|");
}
