import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { Session, User } from '@supabase/supabase-js';
import { AuthService } from '../core/auth.service';
import { captchaIsComplete, TurnstileWidget } from '../core/turnstile-widget';
import {
  hasCurrentAdultConsent,
  normalizeBrazilianPhone,
  PaymentSubmission,
  ReaderAnswerSet,
  ReaderDataService,
} from '../core/reader-data.service';
import {
  FREE_TEXT_QUESTIONS,
  GENRES,
  PROFILE_QUESTIONS,
  SUPPLEMENTARY_QUESTIONS,
} from './questions';
import { scoreReaderProfile } from './score-reader-profile';
import { environment } from '../../environments/environment';

interface ReaderProfileContent {
  key: string;
  name: string;
  tagline: string;
  motivation: string;
  description: string;
  relationship: string;
  strengths: string;
  curationCare: string;
  experience: string;
  keywords: string[];
  genres: string;
  message: string;
}

interface ProfileDocument {
  intro: string;
  methodology: string;
  profiles: ReaderProfileContent[];
}

interface QuestionView {
  id: string;
  prompt: string;
  options?: Array<{ value: string; label: string }>;
}

const allQuestions: QuestionView[] = [
  ...PROFILE_QUESTIONS,
  { id: 'q13', prompt: 'Quais gêneros você gostaria de ler?' },
  ...SUPPLEMENTARY_QUESTIONS,
  ...FREE_TEXT_QUESTIONS,
].sort((left, right) => Number(left.id.slice(1)) - Number(right.id.slice(1)));

@Component({
  selector: 'app-reader-flow',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TurnstileWidget],
  templateUrl: './reader-flow-page.html',
  styleUrl: './reader-flow-page.scss',
})
export class ReaderFlowPage implements OnInit {
  readonly captchaSiteKey = environment.turnstileSiteKey;
  readonly questions = allQuestions;
  readonly genres = GENRES;
  readonly adultText = 'Declaro estar ciente de que, para participar da experiência literária Cria Livros, é necessário ter 18 (dezoito) anos completos ou mais.';

  step: 'access' | 'payment' | 'questionnaire' | 'result' = 'access';
  authMode: 'signup' | 'login' | 'complete' = 'signup';
  user: User | null = null;
  session: Session | null = null;
  fullName = '';
  phone = '';
  email = '';
  password = '';
  adultConfirmed = false;
  loading = false;
  notice = '';
  errorMessage = '';
  payment: PaymentSubmission | null = null;
  receiptFile: File | null = null;
  answers: Record<string, string | string[]> = {};
  questionIndex = 0;
  questionError = '';
  reportContent: ProfileDocument | null = null;
  scoreResult: ReturnType<typeof scoreReaderProfile> | null = null;
  communityLink = '';
  reportError = '';
  captchaToken = '';
  @ViewChild(TurnstileWidget) private captcha?: TurnstileWidget;

  constructor(
    private readonly auth: AuthService,
    private readonly readerData: ReaderDataService,
  ) {}

  async ngOnInit(): Promise<void> {
    await Promise.all([this.auth.initialized, this.loadReportContent()]);
    this.session = this.auth.session();
    this.user = this.auth.user();
    if (this.user) await this.loadReaderFlow();
  }

  get currentQuestion(): QuestionView {
    return this.questions[this.questionIndex];
  }

  get selectedProfileContent(): ReaderProfileContent[] {
    if (!this.scoreResult || !this.reportContent) return [];
    return [...this.scoreResult.primary, ...this.scoreResult.secondary]
      .map((key) => this.reportContent?.profiles.find((profile) => profile.key === key))
      .filter((profile): profile is ReaderProfileContent => Boolean(profile));
  }

  get primaryNames(): string {
    return (this.scoreResult?.primary ?? []).map((key) => this.profileName(key)).join(' + ');
  }

  get secondaryNames(): string {
    return (this.scoreResult?.secondary ?? []).map((key) => this.profileName(key)).join(' + ');
  }

  get progressPercent(): number {
    return Math.round(((this.questionIndex + 1) / this.questions.length) * 100);
  }

  async submitAccess(): Promise<void> {
    this.errorMessage = '';
    this.notice = '';
    this.loading = true;
    try {
      if (!this.user && !captchaIsComplete(this.captchaSiteKey, this.captchaToken)) {
        throw new Error('Conclua a verificação anti-robô para continuar.');
      }
      if (this.authMode === 'signup') {
        if (!this.adultConfirmed) throw new Error('Confirme que tem 18 anos ou mais para continuar.');
        const normalizedPhone = normalizeBrazilianPhone(this.phone);
        if (!normalizedPhone) throw new Error('Informe um número brasileiro válido com DDD.');
        const { data, error } = await this.auth.signUp({
          email: this.email,
          password: this.password,
          fullName: this.fullName,
          phone: normalizedPhone,
          captchaToken: this.captchaToken,
        });
        if (error) throw error;
        if (!data.session || !data.user) {
          this.notice = 'Enviamos um link de confirmação para seu e-mail. Confirme o endereço e entre com sua senha para continuar.';
          return;
        }
        this.user = data.user;
        this.session = data.session;
        await this.readerData.saveContact(data.user.id, {
          fullName: this.fullName,
          phone: normalizedPhone,
          adultConfirmed: true,
        });
      } else if (this.authMode === 'login') {
        const { data, error } = await this.auth.signIn(this.email, this.password, this.captchaToken);
        if (error) throw error;
        this.user = data.user;
        this.session = data.session;
      } else {
        if (!this.user) throw new Error('Entre na sua conta para completar o cadastro.');
        await this.readerData.saveContact(this.user.id, {
          fullName: this.fullName,
          phone: this.phone,
          adultConfirmed: this.adultConfirmed,
        });
      }
      if (this.user) await this.loadReaderFlow();
    } catch (error) {
      this.errorMessage = this.messageFrom(error, 'Não foi possível concluir o acesso.');
    } finally {
      this.captcha?.reset();
      this.loading = false;
    }
  }

  async loadReaderFlow(): Promise<void> {
    if (!this.user) return;
    this.errorMessage = '';
    try {
      let contact = await this.readerData.getContact(this.user.id);
      if (!contact) {
        const metadata = this.user.user_metadata as Record<string, unknown>;
        if (metadata['adult_confirmed'] === true && metadata['reader_full_name'] && metadata['reader_phone']) {
          contact = await this.readerData.saveContact(this.user.id, {
            fullName: String(metadata['reader_full_name']),
            phone: String(metadata['reader_phone']),
            adultConfirmed: true,
          });
        } else {
          this.authMode = 'complete';
          this.step = 'access';
          return;
        }
      } else if (!hasCurrentAdultConsent(contact)) {
        this.fullName = contact.display_name ?? '';
        this.phone = contact.phone ?? '';
        this.adultConfirmed = false;
        this.authMode = 'complete';
        this.step = 'access';
        return;
      }
      this.fullName = contact?.display_name ?? this.fullName;
      this.phone = contact?.phone ?? this.phone;
      this.payment = await this.readerData.getLatestPayment(this.user.id);
      if (this.payment?.status === 'approved') {
        const savedProfile = await this.readerData.getReadingProfile(this.user.id);
        if (savedProfile?.answers) {
          this.scoreResult = scoreReaderProfile(savedProfile.answers);
          this.communityLink = await this.readerData.getCommunityLink(this.scoreResult.primary[0]);
          this.step = 'result';
        } else {
          this.step = 'questionnaire';
          this.questionIndex = 0;
        }
      } else {
        this.step = 'payment';
      }
    } catch (error) {
      this.errorMessage = this.messageFrom(error, 'Não foi possível carregar seu cadastro.');
    }
  }

  onReceiptSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.receiptFile = input.files?.[0] ?? null;
    this.errorMessage = '';
  }

  async sendPaymentProof(): Promise<void> {
    if (!this.user || !this.receiptFile) {
      this.errorMessage = 'Escolha uma imagem ou PDF do comprovante.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    try {
      this.payment = await this.readerData.uploadPaymentProof(this.user.id, this.receiptFile);
      this.receiptFile = null;
      this.notice = 'Comprovante enviado. O mapeamento será liberado após a conferência do pagamento.';
    } catch (error) {
      this.errorMessage = this.messageFrom(error, 'Não foi possível enviar o comprovante.');
    } finally {
      this.loading = false;
    }
  }

  isOptionSelected(questionId: string, value: string): boolean {
    return this.answers[questionId] === value;
  }

  setAnswer(questionId: string, value: string): void {
    this.answers[questionId] = value;
    this.questionError = '';
  }

  isGenreSelected(genre: string): boolean {
    return ((this.answers['q13'] as string[] | undefined) ?? []).includes(genre);
  }

  toggleGenre(genre: string): void {
    const current = [...((this.answers['q13'] as string[] | undefined) ?? [])];
    const index = current.indexOf(genre);
    if (index >= 0) current.splice(index, 1);
    else current.push(genre);
    this.answers['q13'] = current;
    this.questionError = '';
  }

  async nextQuestion(): Promise<void> {
    if (!this.hasCurrentAnswer()) {
      this.questionError = this.currentQuestion.id === 'q13'
        ? 'Escolha ao menos um gênero, mesmo que seja “Quero descobrir”.'
        : 'Escolha uma opção para continuar.';
      return;
    }
    if (this.questionIndex < this.questions.length - 1) {
      this.questionIndex += 1;
      this.questionError = '';
      return;
    }
    await this.saveMapping();
  }

  previousQuestion(): void {
    if (this.questionIndex > 0) this.questionIndex -= 1;
    this.questionError = '';
  }

  hasCurrentAnswer(): boolean {
    const id = this.currentQuestion.id;
    if (id === 'q13') return ((this.answers[id] as string[] | undefined) ?? []).length > 0;
    const current = this.answers[id];
    if (['q17', 'q18', 'q20', 'q21'].includes(id)) return true;
    return typeof current === 'string' && current.length > 0;
  }

  async saveMapping(): Promise<void> {
    if (!this.user) return;
    this.loading = true;
    this.errorMessage = '';
    try {
      const result = await this.readerData.saveReadingProfile(this.user.id, this.answers as ReaderAnswerSet);
      this.scoreResult = result.result;
      this.communityLink = await this.readerData.getCommunityLink(result.result.primary[0]);
      this.step = 'result';
    } catch (error) {
      this.errorMessage = this.messageFrom(error, 'Não foi possível salvar suas respostas.');
    } finally {
      this.loading = false;
    }
  }

  async exportReport(): Promise<void> {
    const accessToken = this.auth.session()?.access_token;
    if (!accessToken) {
      this.reportError = 'Entre novamente para exportar seu relatório.';
      return;
    }
    this.reportError = '';
    this.loading = true;
    try {
      const blob = await this.readerData.exportMyReport(accessToken);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = 'cria-livros-perfil-leitor.pdf';
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      this.reportError = this.messageFrom(error, 'Não foi possível exportar o relatório.');
    } finally {
      this.loading = false;
    }
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.user = null;
    this.session = null;
    this.payment = null;
    this.step = 'access';
    this.authMode = 'login';
  }

  profileName(key: string): string {
    return this.reportContent?.profiles.find((profile) => profile.key === key)?.name ?? key;
  }

  isPrimary(key: string): boolean {
    return (this.scoreResult?.primary as string[] | undefined)?.includes(key) ?? false;
  }

  scoreFor(key: string): number {
    return this.scoreResult?.scores[key as keyof typeof this.scoreResult.scores] ?? 0;
  }

  openProfileLink(): void {
    if (this.communityLink) window.open(this.communityLink, '_blank', 'noopener,noreferrer');
  }

  private async loadReportContent(): Promise<void> {
    try {
      const response = await fetch('/data/reader-profiles.json');
      if (!response.ok) throw new Error('Não foi possível carregar as descrições dos perfis.');
      this.reportContent = (await response.json()) as ProfileDocument;
    } catch (error) {
      this.errorMessage = this.messageFrom(error, 'Não foi possível carregar o conteúdo dos perfis.');
    }
  }

  private messageFrom(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
