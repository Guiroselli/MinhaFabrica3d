export type SubjectType = 'person' | 'pet';
export const ORDER_STATUSES = ['pending', 'in_production', 'printed', 'shipped'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface BodyStyle {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: 'Casual' | 'Sports' | 'Fantasy' | 'Work' | 'Music';
}

export interface CustomOrder {
  id: string;
  subjectType: SubjectType;
  photoUrl?: string;
  styleId?: string;
  status: 'draft' | 'processing' | 'printing' | 'shipped';
  createdAt: string;
  customerName: string;
}

export interface ShowcaseItem {
  id: string;
  title: string;
  imageUrl: string;
  type: SubjectType;
}

export interface SavedOrder {
  id: string;
  userId: string;
  subjectType: SubjectType;
  styleId: string | null;
  styleName: string | null;
  status: OrderStatus;
  totalAmount: number;
  previewImagePath: string | null;
  previewImageUrl: string | null;
  referenceImagePath: string | null;
  referenceImageUrl: string | null;
  promptSnapshot: string | null;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  customerAvatarUrl: string | null;
}
