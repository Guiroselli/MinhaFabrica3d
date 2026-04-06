import { getSupabaseClient } from './supabase';
import { ORDER_STATUSES, OrderStatus, SavedOrder, SubjectType } from './types';

const BONECOS_BUCKET = 'bonecos';
const ORDER_SELECT = `
  id,
  user_id,
  subject_type,
  style_id,
  style_name,
  status,
  total_amount,
  preview_image_path,
  reference_image_path,
  prompt_snapshot,
  created_at,
  customer:profiles!orders_user_id_fkey (
    full_name,
    email,
    avatar_url
  )
`;

interface OrderCustomerRow {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface OrderRow {
  id: string;
  user_id: string;
  subject_type: SubjectType;
  style_id: string | null;
  style_name: string | null;
  status: string;
  total_amount: number | string;
  preview_image_path: string | null;
  reference_image_path: string | null;
  prompt_snapshot: string | null;
  created_at: string;
  customer: OrderCustomerRow | OrderCustomerRow[] | null;
}

interface CreateOrderInput {
  subjectType: SubjectType;
  styleId?: string | null;
  styleName?: string | null;
  totalAmount: number;
  referenceImageDataUrl: string;
  previewImageDataUrl: string;
  promptSnapshot?: string | null;
}

function normalizeOrderStatus(status: string): OrderStatus {
  return ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : 'pending';
}

function getFileExtension(mimeType: string) {
  if (mimeType === 'image/jpeg') {
    return 'jpg';
  }

  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return 'bin';
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  return {
    blob,
    mimeType: blob.type || 'application/octet-stream',
  };
}

async function uploadImage(userId: string, orderId: string, kind: 'preview' | 'reference', dataUrl: string) {
  const supabase = getSupabaseClient();
  const { blob, mimeType } = await dataUrlToBlob(dataUrl);
  const extension = getFileExtension(mimeType);
  const path = `${userId}/${orderId}/${kind}.${extension}`;

  const { error } = await supabase.storage.from(BONECOS_BUCKET).upload(path, blob, {
    contentType: mimeType,
    upsert: true,
    cacheControl: '3600',
  });

  if (error) {
    throw new Error(`Nao foi possivel enviar a imagem ${kind} para o Supabase.`);
  }

  return path;
}

async function createSignedUrl(path: string | null) {
  if (!path) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(BONECOS_BUCKET).createSignedUrl(path, 60 * 60);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

async function mapOrder(row: OrderRow): Promise<SavedOrder> {
  const customer = Array.isArray(row.customer) ? row.customer[0] || null : row.customer;
  const [previewImageUrl, referenceImageUrl] = await Promise.all([
    createSignedUrl(row.preview_image_path),
    createSignedUrl(row.reference_image_path),
  ]);

  return {
    id: row.id,
    userId: row.user_id,
    subjectType: row.subject_type,
    styleId: row.style_id,
    styleName: row.style_name,
    status: normalizeOrderStatus(row.status),
    totalAmount: Number(row.total_amount),
    previewImagePath: row.preview_image_path,
    previewImageUrl,
    referenceImagePath: row.reference_image_path,
    referenceImageUrl,
    promptSnapshot: row.prompt_snapshot,
    createdAt: row.created_at,
    customerName: customer?.full_name ?? null,
    customerEmail: customer?.email ?? null,
    customerAvatarUrl: customer?.avatar_url ?? null,
  };
}

export async function listOrders(): Promise<SavedOrder[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Nao foi possivel carregar os pedidos da sua conta.');
  }

  return Promise.all(((data || []) as OrderRow[]).map(mapOrder));
}

export async function listAdminOrders(): Promise<SavedOrder[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Nao foi possivel carregar o painel de admin.');
  }

  return Promise.all(((data || []) as OrderRow[]).map(mapOrder));
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<SavedOrder> {
  const supabase = getSupabaseClient();

  if (!ORDER_STATUSES.includes(status)) {
    throw new Error('Status de pedido invalido.');
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select(ORDER_SELECT)
    .single();

  if (error || !data) {
    throw new Error('Nao foi possivel atualizar o status deste pedido.');
  }

  return mapOrder(data as OrderRow);
}

export async function createOrder(input: CreateOrderInput): Promise<SavedOrder> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Entre na sua conta para salvar o pedido.');
  }

  const orderId = crypto.randomUUID();
  const previewImagePath = await uploadImage(user.id, orderId, 'preview', input.previewImageDataUrl);
  const referenceImagePath = await uploadImage(user.id, orderId, 'reference', input.referenceImageDataUrl);

  const { data, error } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      user_id: user.id,
      subject_type: input.subjectType,
      style_id: input.styleId ?? null,
      style_name: input.styleName ?? null,
      status: 'pending',
      total_amount: input.totalAmount,
      preview_image_path: previewImagePath,
      reference_image_path: referenceImagePath,
      prompt_snapshot: input.promptSnapshot ?? null,
    })
    .select(ORDER_SELECT)
    .single();

  if (error || !data) {
    throw new Error('Nao foi possivel salvar o pedido no banco de dados.');
  }

  return mapOrder(data as OrderRow);
}
