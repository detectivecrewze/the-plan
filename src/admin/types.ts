import type { GiftProject, Locale } from '../project';
import type { ThemeId } from '../themes';
import type { PlanFormAnswers } from '../form/types';

export type OrderStatus = 'waiting_form' | 'ready_to_craft' | 'in_progress' | 'review' | 'done';

export interface AdminOrder {
  orderId: string;
  projectId: string;
  formToken: string;
  source: 'manual' | 'payment';
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  recipient: string;
  sender: string;
  locale: Locale;
  theme: ThemeId;
  notes: string;
  answers?: PlanFormAnswers;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  draftAppliedAt?: string;
}

export interface ProjectSummary {
  id: string;
  recipient: string;
  sender: string;
  locale: Locale;
  theme: ThemeId;
  savedAt: string;
  publishedAt: string | null;
}

export interface RecipientResponse {
  projectId: string;
  answer: 'yes';
  answeredAt: string;
}

export interface DashboardData {
  orders: AdminOrder[];
  projects: ProjectSummary[];
  responses: RecipientResponse[];
}

export interface CreateOrderPayload {
  project: GiftProject;
  order: Pick<AdminOrder, 'orderId' | 'projectId' | 'formToken'>;
}
