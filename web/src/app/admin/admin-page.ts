import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { User } from '@supabase/supabase-js';
import { AuthService } from '../core/auth.service';
import { captchaIsComplete, TurnstileWidget } from '../core/turnstile-widget';
import {
  canApprovePayment as isPaymentApprovalComplete,
  PaymentApprovalChecklist,
  PaymentReview,
  ReaderDataService,
} from '../core/reader-data.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TurnstileWidget],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
})
export class AdminPage implements OnInit {
  readonly canApprovePayment = isPaymentApprovalComplete;
  readonly captchaSiteKey = environment.turnstileSiteKey;
  readonly masterEmail = 'orange.goncalves@gmail.com';
  readonly passwordRecovery: AuthService['passwordRecovery'];
  user: User | null = null;
  authorized = false;
  mode: 'login' | 'signup' = 'login';
  email = this.masterEmail;
  password = '';
  newPassword = '';
  confirmPassword = '';
  communityLink = '';
  queue: PaymentReview[] = [];
  reviewChecks: Record<string, PaymentApprovalChecklist> = {};
  loading = false;
  errorMessage = '';
  notice = '';
  captchaToken = '';
  @ViewChild(TurnstileWidget) private captcha?: TurnstileWidget;

  constructor(
    private readonly auth: AuthService,
    private readonly readerData: ReaderDataService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {
    this.passwordRecovery = auth.passwordRecovery;
  }

  async ngOnInit(): Promise<void> {
    await this.auth.initialized;
    this.user = this.auth.user();
    if (this.user && !this.passwordRecovery()) await this.loadAdminPanel();
  }

  async submitAccess(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.notice = '';
    try {
      if (!captchaIsComplete(this.captchaSiteKey, this.captchaToken)) {
        throw new Error('Conclua a verificação anti-robô para continuar.');
      }
      if (this.mode === 'signup') {
        const { data, error } = await this.auth.signUpAdmin(this.email, this.password, this.captchaToken);
        if (error) throw error;
        if (data.user?.identities?.length === 0) {
          this.mode = 'login';
          this.notice = 'Esta conta já está cadastrada. Entre com a senha existente ou use “Esqueci minha senha”.';
          return;
        }
        if (!data.session || !data.user) {
          this.notice = 'Enviamos um e-mail de confirmação. Depois de confirmar, entre aqui com a senha criada.';
          return;
        }
        this.user = data.user;
      } else {
        const { data, error } = await this.auth.signIn(this.email, this.password, this.captchaToken);
        if (error) {
          if (/invalid login credentials/i.test(error.message)) {
            throw new Error('E-mail ou senha incorretos. Confira os dados ou use “Esqueci minha senha”.');
          }
          throw error;
        }
        this.user = data.user;
      }
      await this.loadAdminPanel();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível entrar no painel.';
    } finally {
      this.captcha?.reset();
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  async requestPasswordReset(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.notice = '';
    try {
      if (!captchaIsComplete(this.captchaSiteKey, this.captchaToken)) {
        throw new Error('Conclua a verificação anti-robô para continuar.');
      }
      const { error } = await this.auth.requestAdminPasswordReset(this.email, this.captchaToken);
      if (error) throw error;
      this.notice = 'Se o e-mail autorizado estiver cadastrado, enviaremos um link de recuperação. Confira sua caixa de entrada e o spam.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível solicitar a recuperação da senha.';
    } finally {
      this.captcha?.reset();
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  async completePasswordRecovery(): Promise<void> {
    if (this.newPassword.length < 8) {
      this.errorMessage = 'A nova senha precisa ter pelo menos 8 caracteres.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'As senhas não conferem.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.notice = '';
    try {
      const { data, error } = await this.auth.updatePassword(this.newPassword);
      if (error) throw error;
      this.password = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.user = data.user;
      this.notice = 'Senha atualizada. Acessando o painel…';
      await this.loadAdminPanel();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível atualizar a senha.';
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  async loadAdminPanel(): Promise<void> {
    if (!this.user) return;
    this.loading = true;
    this.errorMessage = '';
    try {
      this.authorized = await this.readerData.isPlatformAdmin(this.user.id);
      if (!this.authorized) {
        this.errorMessage = `A conta ${this.user.email ?? ''} não tem acesso administrativo. O acesso mestre é concedido após confirmar ${this.masterEmail}.`;
        return;
      }
      const [queue, link] = await Promise.all([
        this.readerData.getPaymentQueue(),
        this.readerData.getConfiguredCommunityLink(),
      ]);
      this.queue = queue;
      this.reviewChecks = Object.fromEntries(queue.map((payment) => [
        payment.id,
        this.reviewChecks[payment.id] ?? {
          amountVerified: false,
          recipientVerified: false,
          transferSettled: false,
        },
      ]));
      this.communityLink = link;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível carregar o painel.';
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  async review(payment: PaymentReview, status: 'approved' | 'rejected'): Promise<void> {
    if (status === 'approved' && !isPaymentApprovalComplete(this.reviewChecks[payment.id])) {
      this.errorMessage = 'Confirme o valor, o destinatário e a liquidação no extrato antes de aprovar.';
      return;
    }
    if (!this.user) return;
    this.loading = true;
    this.errorMessage = '';
    this.notice = '';
    try {
      await this.readerData.reviewPayment(payment.id, status, this.user.id, this.reviewChecks[payment.id]);
      this.notice = status === 'approved'
        ? `Pagamento de ${payment.full_name} aprovado. O mapeamento já está liberado.`
        : `Comprovante de ${payment.full_name} recusado. A pessoa poderá enviar outro.`;
      await this.loadAdminPanel();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível atualizar o pagamento.';
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  async saveCommunityLink(): Promise<void> {
    if (!this.user) return;
    const valid = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{6,255}[A-Za-z0-9_-]?(?:\?[A-Za-z0-9_=&%-]*)?$/.test(this.communityLink.trim());
    if (!valid) {
      this.errorMessage = 'Informe um link válido da comunidade do WhatsApp.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.notice = '';
    try {
      await this.readerData.updateCommunityLink(this.user.id, this.communityLink);
      this.notice = 'Link da comunidade atualizado para todos os perfis leitores.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível salvar o link.';
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  isImage(path: string): boolean {
    return /\.(png|jpe?g|webp)$/i.test(path);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.user = null;
    this.authorized = false;
    this.mode = 'login';
    this.changeDetector.markForCheck();
  }
}
