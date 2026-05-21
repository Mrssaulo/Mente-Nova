export const platformOptions = [
  "Vercel",
  "Supabase",
  "Registro.br",
  "OpenRouter",
  "Stripe",
  "GitHub",
  "Hostinger",
  "Outro",
] as const;

export const projectStatusOptions = ["ativo", "atenção", "pausado", "vencendo", "parado"] as const;

export const contentPlatformOptions = [
  "Instagram",
  "TikTok",
  "YouTube",
  "WhatsApp",
  "LinkedIn",
  "Blog",
  "Outro",
] as const;

export const contentTypeOptions = ["story", "reels", "carrossel", "vídeo", "post comum", "artigo", "outro"] as const;
export const contentStatusOptions = ["ideia", "roteiro", "em produção", "pronto", "agendado", "publicado"] as const;

export const maintenanceTypeOptions = [
  "Atualizar projeto",
  "Conferir deploy",
  "Verificar Supabase",
  "Verificar Vercel",
  "Verificar OpenRouter/API",
  "Fazer backup",
  "Testar login",
  "Testar pagamento",
  "Corrigir bugs",
  "Verificar site online",
  "Atualizar dependências",
  "Outro",
] as const;

export const reminderTypeOptions = [
  "renovação",
  "pagamento",
  "manutenção",
  "backup",
  "entrega",
  "verificação",
  "financeiro",
  "outro",
] as const;

export const taskCategoryOptions = [
  "administração",
  "estratégia",
  "comercial",
  "design",
  "suporte",
  "jurídico",
  "operação",
  "outro",
] as const;

export const recurrenceOptions = ["diário", "semanal", "mensal", "anual", "único", "permanente", "nunca mais"] as const;
export const priorityOptions = ["baixa", "média", "alta", "crítica"] as const;
export const reminderStatusOptions = ["pendente", "concluído", "atrasado", "ignorado"] as const;
export const taskStatusOptions = ["pendente", "em andamento", "concluído", "atrasado", "cancelado"] as const;
export const financeStatusOptions = ["pago", "pendente", "atrasado", "cancelado"] as const;
export const calendarStatusOptions = [
  "ideia",
  "roteiro",
  "em produção",
  "pronto",
  "agendado",
  "publicado",
  "pendente",
  "em andamento",
  "concluído",
  "pago",
  "vencendo",
  "atrasado",
  "cancelado",
  "permanente",
] as const;

export const calendarCategoryOptions = ["conteúdo", "manutenção", "financeiro", "renovação", "tarefa", "lembrete"] as const;

export type Platform = (typeof platformOptions)[number];
export type ProjectStatus = (typeof projectStatusOptions)[number];
export type ContentPlatform = (typeof contentPlatformOptions)[number];
export type ContentType = (typeof contentTypeOptions)[number];
export type ContentStatus = (typeof contentStatusOptions)[number];
export type MaintenanceType = (typeof maintenanceTypeOptions)[number];
export type ReminderType = (typeof reminderTypeOptions)[number];
export type TaskCategory = (typeof taskCategoryOptions)[number];
export type Recurrence = (typeof recurrenceOptions)[number];
export type Priority = (typeof priorityOptions)[number];
export type ReminderStatus = (typeof reminderStatusOptions)[number];
export type TaskStatus = (typeof taskStatusOptions)[number];
export type FinanceStatus = (typeof financeStatusOptions)[number];
export type CalendarStatus = (typeof calendarStatusOptions)[number];
export type CalendarCategory = (typeof calendarCategoryOptions)[number];
export type CalendarMode = "dia" | "semana" | "mês";
export type AppView =
  | "calendário"
  | "dashboard"
  | "projetos"
  | "conteúdo"
  | "manutenção"
  | "renovações"
  | "financeiro"
  | "tarefas";

export interface Project {
  id: string;
  name: string;
  siteUrl: string;
  description: string;
  platform: Platform;
  status: ProjectStatus;
  notes: string;
  adminUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  projectId: string;
  dueDate: string;
  type: ReminderType;
  recurrence: Recurrence;
  priority: Priority;
  status: ReminderStatus;
  notes: string;
  originUrl: string;
  recurrenceStopped: boolean;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  projectId: string;
  platform: ContentPlatform;
  type: ContentType;
  status: ContentStatus;
  postDate: string;
  priority: Priority;
  caption: string;
  assetUrl: string;
  notes: string;
  recurrence: Recurrence;
  recurrenceStopped: boolean;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface MaintenanceItem {
  id: string;
  title: string;
  projectId: string;
  kind: MaintenanceType;
  date: string;
  recurrence: Recurrence;
  priority: Priority;
  status: TaskStatus;
  originUrl: string;
  notes: string;
  recurrenceStopped: boolean;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface GeneralTask {
  id: string;
  title: string;
  projectId: string;
  category: TaskCategory;
  date: string;
  priority: Priority;
  status: TaskStatus;
  recurrence: Recurrence;
  originUrl: string;
  notes: string;
  recurrenceStopped: boolean;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface FinanceItem {
  id: string;
  name: string;
  projectId: string;
  amountBrl: number;
  amountUsd: number;
  dueDate: string;
  recurrence: Recurrence;
  status: FinanceStatus;
  originUrl: string;
  notes: string;
  recurrenceStopped: boolean;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export interface AppData {
  schemaVersion?: number;
  projects: Project[];
  reminders: Reminder[];
  contentItems: ContentItem[];
  maintenanceItems: MaintenanceItem[];
  financeItems: FinanceItem[];
  generalTasks: GeneralTask[];
}

export interface CalendarEvent {
  id: string;
  kind: CalendarCategory;
  title: string;
  projectId: string;
  projectName: string;
  date: string;
  recurrence: Recurrence;
  recurrenceStopped: boolean;
  priority?: Priority;
  status: CalendarStatus;
  rawStatus: string;
  originUrl: string;
  platform?: ContentPlatform;
  type?: string;
  amountBrl?: number;
  amountUsd?: number;
}
