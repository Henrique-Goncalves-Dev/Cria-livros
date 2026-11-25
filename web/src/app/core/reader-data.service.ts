import { Injectable } from '@angular/core';
import { scoreReaderProfile } from '../reader/score-reader-profile';
import { environment } from '../../environments/environment';
import { supabase } from './supabase.client';

export interface ContactDraft {
  fullName: string;
  phone: string;
  adultConfirmed: boolean;
}

export interface PaymentSubmission {
  id: string;
  receipt_path: string;
  status: 'pending_review' | 'approved' | 'rejected';
  submitted_at: string;
  amount_cents: number;
}

export interface ReaderAnswerSet extends Record<string, unknown> {
  q13: string[];
  q14: string;
  q15: string;
  q16: string;
  q17: string;
  q18: string;
  q19: string;
  q20: string;
  q21: string;
}

export interface PaymentReview {
  id: string;
  user_id: string;
  receipt_path: string;
  status: 'pending_review' | 'approved' | 'rejected';
  submitted_at: string;
  amount_cents: number;
  full_name: string;
  phone: string;
  receipt_url: string;
}

export interface PaymentApprovalChecklist {
  amountVerified: boolean;
  recipientVerified: boolean;
  transferSettled: boolean;
}

export function canApprovePayment(checklist: PaymentApprovalChecklist | null | undefined): boolean {
  return checklist?.amountVerified === true
    && checklist.recipientVerified === true
    && checklist.transferSettled === true;
}

export function detectReceiptImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12
    && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function hasCurrentAdultConsent(
  contact: { adult_confirmed?: boolean | null; adult_attested_at?: string | null } | null,
): boolean {
  return contact?.adult_confirmed === true && Boolean(contact.adult_attested_at);
}

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export function normalizeBrazilianPhone(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('+') && !trimmed.startsWith('+55')) return '';
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  return '';
}

@Injectable({ providedIn: 'root' })
export class ReaderDataService {
  async getContact(userId: string) {
    const { data, error } = await supabase
      .from('reader_contact_profiles')
      .select('user_id, display_name, phone, adult_confirmed, adult_attested_at')
      .eq('user_id', userId)
      .maybeSingle();
    throwIfError(error);
    return data;
  }

  async saveContact(userId: string, draft: ContactDraft) {
    if (!draft.adultConfirmed) throw new Error('Confirme que tem 18 anos ou mais.');
    const phone = normalizeBrazilianPhone(draft.phone);
    if (!phone) throw new Error('Informe um telefone brasileiro válido com DDD.');
    const { data, error } = await supabase
      .from('reader_contact_profiles')
      .upsert(
        {
          user_id: userId,
          display_name: draft.fullName.trim(),
          phone,
          adult_confirmed: true,
          adult_attested_at: new Date().toISOString(),
          privacy_notice_version: 'cria-livros-v1',
          privacy_notice_accepted_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('user_id, display_name, phone, adult_confirmed, adult_attested_at')
      .single();
    throwIfError(error);
    return data;
  }

  async getLatestPayment(userId: string): Promise<PaymentSubmission | null> {
    const { data, error } = await supabase
      .from('payment_submissions')
      .select('id, receipt_path, status, submitted_at, amount_cents')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    throwIfError(error);
    return data as PaymentSubmission | null;
  }

  async uploadPaymentProof(userId: string, file: File): Promise<PaymentSubmission> {
    const permittedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!permittedTypes.includes(file.type)) {
      throw new Error('Envie uma foto do comprovante em JPG, PNG ou WebP.');
    }
    if (file.size > 5 * 1024 * 1024) throw new Error('O comprovante precisa ter até 5 MB.');
    const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const detectedType = detectReceiptImageMime(signature);
    if (detectedType !== file.type) {
      throw new Error('O arquivo não corresponde a uma imagem JPG, PNG ou WebP válida.');
    }

    const extensionByType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const extension = extensionByType[detectedType];
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(path, file, { contentType: file.type, upsert: false });
    throwIfError(uploadError);

    const { data, error } = await supabase
      .from('payment_submissions')
      .insert({ user_id: userId, receipt_path: path, amount_cents: 2000 })
      .select('id, receipt_path, status, submitted_at, amount_cents')
      .single();
    if (error) {
      await supabase.storage.from('payment-proofs').remove([path]);
      throw new Error(error.message);
    }
    return data as PaymentSubmission;
  }

  async getReadingProfile(userId: string) {
    const { data, error } = await supabase
      .from('reading_profiles')
      .select('answers, profile_scores, profile_leaders')
      .eq('user_id', userId)
      .maybeSingle();
    throwIfError(error);
    return data;
  }

  async saveReadingProfile(userId: string, answers: ReaderAnswerSet) {
    const result = scoreReaderProfile(answers);
    const { data, error } = await supabase
      .from('reading_profiles')
      .upsert(
        {
          user_id: userId,
          display_name: '',
          answers,
          profile_scores: result.scores,
          profile_leaders: result.primary,
          preferred_genres: answers.q13,
          avoided_topics: String(answers.q17 ?? '').slice(0, 500),
        },
        { onConflict: 'user_id' },
      )
      .select('answers, profile_scores, profile_leaders')
      .single();
    throwIfError(error);
    return { data, result };
  }

  async getCommunityLink(profileKey: string): Promise<string> {
    const { data, error } = await supabase
      .from('reader_group_settings')
      .select('invite_url')
      .eq('profile_key', profileKey)
      .single();
    throwIfError(error);
    return data?.invite_url ?? '';
  }

  async isPlatformAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    throwIfError(error);
    return Boolean(data);
  }

  async getPaymentQueue(): Promise<PaymentReview[]> {
    const { data: payments, error } = await supabase
      .from('payment_submissions')
      .select('id, user_id, receipt_path, status, submitted_at, amount_cents')
      .eq('status', 'pending_review')
      .order('submitted_at', { ascending: true });
    throwIfError(error);
    if (!payments?.length) return [];

    const userIds = [...new Set(payments.map((payment) => payment.user_id))];
    const { data: contacts, error: contactError } = await supabase
      .from('reader_contact_profiles')
      .select('user_id, display_name, phone')
      .in('user_id', userIds);
    throwIfError(contactError);
    const contactById = new Map(contacts?.map((contact) => [contact.user_id, contact]));

    return Promise.all(
      payments.map(async (payment) => {
        const { data: signed, error: signedError } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(payment.receipt_path, 600);
        throwIfError(signedError);
        if (!signed?.signedUrl) throw new Error('Não foi possível abrir o comprovante.');
        const contact = contactById.get(payment.user_id);
        return {
          ...payment,
          full_name: contact?.display_name ?? 'Leitor(a)',
          phone: contact?.phone ?? '',
          receipt_url: signed.signedUrl,
        } as PaymentReview;
      }),
    );
  }

  async reviewPayment(
    paymentId: string,
    status: 'approved' | 'rejected',
    reviewerId: string,
    verification: PaymentApprovalChecklist = {
      amountVerified: false,
      recipientVerified: false,
      transferSettled: false,
    },
  ): Promise<void> {
    const { error } = await supabase
      .from('payment_submissions')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        verified_amount_cents: status === 'approved' && verification.amountVerified ? 2000 : null,
        recipient_verified: status === 'approved' && verification.recipientVerified,
        transfer_settled: status === 'approved' && verification.transferSettled,
        access_expires_at: null,
      })
      .eq('id', paymentId);
    throwIfError(error);
  }

  async getConfiguredCommunityLink(): Promise<string> {
    const { data, error } = await supabase
      .from('reader_group_settings')
      .select('invite_url')
      .eq('profile_key', 'explorador')
      .single();
    throwIfError(error);
    return data?.invite_url ?? '';
  }

  async updateCommunityLink(userId: string, url: string): Promise<void> {
    const { error } = await supabase
      .from('reader_group_settings')
      .update({ invite_url: url.trim(), updated_at: new Date().toISOString(), updated_by: userId })
      .in('profile_key', ['explorador', 'imersivo', 'investigador', 'contemplativo']);
    throwIfError(error);
  }

  async exportMyReport(accessToken: string): Promise<Blob> {
    const response = await fetch(`${environment.apiUrl}/reports/me.pdf`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message ?? 'Não foi possível exportar o relatório.');
    }
    return response.blob();
  }
}
