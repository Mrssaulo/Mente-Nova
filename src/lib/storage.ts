import type {
  AppData,
  ContentItem,
  FinanceItem,
  GeneralTask,
  MaintenanceItem,
  Project,
  Reminder,
} from "../types";
import { addDays, addMonths, todayKey } from "./dates";

const storageKey = "painel-manutencao-projetos:v1";
const currentSchemaVersion = 2;

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function seedData(): AppData {
  const today = todayKey();
  const now = new Date().toISOString();
  const portfolioId = id("project");
  const billingId = id("project");
  const domainId = id("project");

  return {
    schemaVersion: currentSchemaVersion,
    projects: [
      {
        id: portfolioId,
        name: "Site institucional",
        siteUrl: "https://example.com",
        description: "Projeto público principal com domínio, deploy, posts e formulários.",
        platform: "Vercel",
        status: "ativo",
        notes: "Acompanhar deploy, domínio, integrações críticas e calendário de conteúdo.",
        adminUrl: "https://vercel.com",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: billingId,
        name: "Sistema de assinaturas",
        siteUrl: "",
        description: "Pagamentos, webhooks e fluxo de cobrança recorrente.",
        platform: "Stripe",
        status: "atenção",
        notes: "Revisar chaves, webhooks e testes de pagamento sempre que houver alteração de plano.",
        adminUrl: "https://dashboard.stripe.com",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: domainId,
        name: "Domínio principal",
        siteUrl: "",
        description: "Registro, DNS e renovação do domínio principal.",
        platform: "Registro.br",
        status: "vencendo",
        notes: "Renovação anual importante para evitar indisponibilidade.",
        adminUrl: "https://registro.br",
        createdAt: now,
        updatedAt: now,
      },
    ],
    reminders: [
      {
        id: id("reminder"),
        title: "Renovar domínio",
        projectId: domainId,
        dueDate: addDays(today, 15),
        type: "renovação",
        recurrence: "anual",
        priority: "crítica",
        status: "pendente",
        notes: "Confirmar renovação antes da janela crítica.",
        originUrl: "https://registro.br",
        recurrenceStopped: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: id("reminder"),
        title: "Entrega de revisão mensal",
        projectId: portfolioId,
        dueDate: addDays(today, 10),
        type: "entrega",
        recurrence: "mensal",
        priority: "média",
        status: "pendente",
        notes: "Revisar evolução do projeto e próximos ajustes.",
        originUrl: "",
        recurrenceStopped: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    contentItems: [
      {
        id: id("content"),
        title: "Post de bastidores do projeto",
        projectId: portfolioId,
        platform: "Instagram",
        type: "carrossel",
        status: "ideia",
        postDate: today,
        priority: "alta",
        caption: "Mostrar uma melhoria recente e convidar o público para testar.",
        assetUrl: "",
        notes: "Transformar em roteiro curto antes de produzir a arte.",
        recurrence: "semanal",
        recurrenceStopped: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: id("content"),
        title: "Vídeo explicando cobrança recorrente",
        projectId: billingId,
        platform: "YouTube",
        type: "vídeo",
        status: "roteiro",
        postDate: addDays(today, 5),
        priority: "média",
        caption: "",
        assetUrl: "",
        notes: "Focar em clareza e segurança para novos usuários.",
        recurrence: "único",
        recurrenceStopped: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    maintenanceItems: [
      {
        id: id("maintenance"),
        title: "Verificar deploy e domínio",
        projectId: portfolioId,
        kind: "Conferir deploy",
        date: today,
        recurrence: "semanal",
        priority: "alta",
        status: "pendente",
        notes: "Checar SSL, DNS, formulário e última publicação.",
        originUrl: "https://vercel.com",
        recurrenceStopped: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: id("maintenance"),
        title: "Backup de banco",
        projectId: portfolioId,
        kind: "Fazer backup",
        date: addDays(today, 7),
        recurrence: "mensal",
        priority: "média",
        status: "pendente",
        notes: "Baixar dump e validar arquivo.",
        originUrl: "",
        recurrenceStopped: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    financeItems: [
      {
        id: id("finance"),
        name: "Hospedagem Vercel",
        projectId: portfolioId,
        amountBrl: 0,
        amountUsd: 20,
        dueDate: addDays(today, 7),
        recurrence: "mensal",
        status: "pendente",
        originUrl: "https://vercel.com/account/billing",
        notes: "Plano mensal do projeto.",
        recurrenceStopped: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: id("finance"),
        name: "Domínio .com.br",
        projectId: domainId,
        amountBrl: 40,
        amountUsd: 0,
        dueDate: addDays(today, 15),
        recurrence: "anual",
        status: "pendente",
        originUrl: "https://registro.br",
        notes: "Renovação anual.",
        recurrenceStopped: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: id("finance"),
        name: "Ferramenta de testes",
        projectId: billingId,
        amountBrl: 79,
        amountUsd: 0,
        dueDate: addMonths(today, -1),
        recurrence: "mensal",
        status: "pago",
        originUrl: "",
        notes: "Pagamento já registrado para compor o histórico.",
        recurrenceStopped: false,
        createdAt: now,
        updatedAt: now,
        paidAt: now,
      },
    ],
    generalTasks: [
      {
        id: id("task"),
        title: "Revisar ideias de melhorias",
        projectId: portfolioId,
        category: "estratégia",
        date: addDays(today, 2),
        priority: "média",
        status: "pendente",
        recurrence: "semanal",
        originUrl: "",
        notes: "Separar ideias que viram tarefa técnica, conteúdo ou melhoria de produto.",
        recurrenceStopped: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: id("task"),
        title: "Organizar próximos experimentos",
        projectId: billingId,
        category: "operação",
        date: addDays(today, 4),
        priority: "alta",
        status: "em andamento",
        recurrence: "único",
        originUrl: "",
        notes: "",
        recurrenceStopped: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
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
  let reminders = (parsed.reminders ?? []).map((reminder) => normalizeReminder(reminder, now));
  let maintenanceItems = (parsed.maintenanceItems ?? []).map((item) => normalizeMaintenance(item, now));
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

  return {
    schemaVersion: currentSchemaVersion,
    projects: (parsed.projects ?? []).map((project) => normalizeProject(project, now)),
    reminders,
    contentItems: (parsed.contentItems ?? []).map((item) => normalizeContent(item, now)),
    maintenanceItems,
    financeItems: (parsed.financeItems ?? []).map((item) => normalizeFinance(item, now)),
    generalTasks: (parsed.generalTasks ?? []).map((task) => normalizeTask(task, now)),
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
