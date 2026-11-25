import { Injectable, signal } from '@angular/core';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(null);
  readonly session = signal<Session | null>(null);
  readonly passwordRecovery = signal(false);
  readonly initialized = this.loadInitialSession();

  private async loadInitialSession(): Promise<void> {
    supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      this.session.set(session);
      this.user.set(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') this.passwordRecovery.set(true);
      if (event === 'SIGNED_OUT') this.passwordRecovery.set(false);
    });
    const { data } = await supabase.auth.getSession();
    this.session.set(data.session);
    this.user.set(data.session?.user ?? null);
  }

  async signUp(input: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    captchaToken?: string;
  }) {
    return supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        emailRedirectTo: window.location.origin,
        captchaToken: input.captchaToken || undefined,
        data: {
          reader_full_name: input.fullName.trim(),
          reader_phone: input.phone,
          adult_confirmed: true,
          adult_attested_at: new Date().toISOString(),
        },
      },
    });
  }

  async signIn(email: string, password: string, captchaToken = '') {
    return supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
      options: { captchaToken: captchaToken || undefined },
    });
  }

  async signUpAdmin(email: string, password: string, captchaToken = '') {
    if (email.trim().toLowerCase() !== 'orange.goncalves@gmail.com') {
      throw new Error('O acesso mestre está reservado ao e-mail autorizado.');
    }
    return supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
        captchaToken: captchaToken || undefined,
      },
    });
  }

  async requestAdminPasswordReset(email: string, captchaToken = '') {
    if (email.trim().toLowerCase() !== 'orange.goncalves@gmail.com') {
      throw new Error('A recuperação está reservada ao e-mail autorizado.');
    }
    return supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/admin`,
      captchaToken: captchaToken || undefined,
    });
  }

  async updatePassword(password: string) {
    const result = await supabase.auth.updateUser({ password });
    if (!result.error) this.passwordRecovery.set(false);
    return result;
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    this.session.set(null);
    this.user.set(null);
    this.passwordRecovery.set(false);
  }
}
