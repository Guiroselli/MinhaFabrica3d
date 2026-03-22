import { getSupabaseClient } from './supabase';
import { SavedOrder, SubjectType } from './types';

const BONECOS_BUCKET = 'bonecos';

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
  return {
    id: row.id,
    userId: row.user_id,
    subjectType: row.subject_type,
    styleId: row.style_id,
    styleName: row.style_name,
    status: row.status,
    totalAmount: Number(row.total_amount),
    previewImagePath: row.preview_image_path,
    previewImageUrl: await createSignedUrl(row.preview_image_path),
    referenceImagePath: row.reference_image_path,
    promptSnapshot: row.prompt_snapshot,
    createdAt: row.created_at,
  };
}

export async function listOrders(): Promise<SavedOrder[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Nao foi possivel carregar os pedidos da sua conta.');
  }

  return Promise.all(((data || []) as OrderRow[]).map(mapOrder));
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
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('Nao foi possivel salvar o pedido no banco de dados.');
  }

  return mapOrder(data as OrderRow);
}
