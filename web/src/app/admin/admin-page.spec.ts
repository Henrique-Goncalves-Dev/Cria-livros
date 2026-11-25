import { ChangeDetectorRef, signal } from '@angular/core';
import type { User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { AdminPage } from './admin-page';
import { AuthService } from '../core/auth.service';
import { ReaderDataService } from '../core/reader-data.service';

const masterUser = {
  id: 'master-user',
  email: 'orange.goncalves@gmail.com',
} as unknown as User;

const createAdminPage = (signUpResponse: unknown = { data: { user: null, session: null }, error: null }) => {
  const auth = {
    user: signal<User | null>(null),
    session: signal(null),
    passwordRecovery: signal(false),
    initialized: Promise.resolve(),
    signUpAdmin: vi.fn().mockResolvedValue(signUpResponse),
    signIn: vi.fn().mockResolvedValue({ data: { user: masterUser }, error: null }),
    requestAdminPasswordReset: vi.fn().mockResolvedValue({ data: {}, error: null }),
    updatePassword: vi.fn(),
    signOut: vi.fn(),
  };
  auth.updatePassword.mockImplementation(async () => {
    auth.passwordRecovery.set(false);
    return { data: { user: masterUser }, error: null };
  });
  const readerData = {
    isPlatformAdmin: vi.fn().mockResolvedValue(true),
    getPaymentQueue: vi.fn().mockResolvedValue([]),
    getConfiguredCommunityLink: vi.fn().mockResolvedValue('https://chat.whatsapp.com/examplelink'),
  };
  const changeDetector = { markForCheck: vi.fn() } as unknown as ChangeDetectorRef;
  const page = new AdminPage(
    auth as unknown as AuthService,
    readerData as unknown as ReaderDataService,
    changeDetector,
  );
  return { page, changeDetector, auth, readerData };
};

describe('AdminPage access form', () => {
  it('opens in login mode for the existing master account', () => {
    const { page } = createAdminPage();

    expect(page.mode).toBe('login');
  });

  it('releases loading and routes an existing account to login after signup returns 200', async () => {
    const { page, changeDetector } = createAdminPage({
      data: { user: { identities: [] }, session: null },
      error: null,
    });
    page.mode = 'signup';

    await page.submitAccess();

    expect(page.loading).toBe(false);
    expect(page.mode).toBe('login');
    expect(page.notice).toMatch(/já está cadastrada/);
    expect(changeDetector.markForCheck).toHaveBeenCalled();
  });

  it('shows email confirmation for a newly created account', async () => {
    const { page } = createAdminPage({
      data: { user: { identities: [{ provider: 'email' }] }, session: null },
      error: null,
    });
    page.mode = 'signup';

    await page.submitAccess();

    expect(page.loading).toBe(false);
    expect(page.notice).toMatch(/e-mail de confirmação/);
  });

  it('explains invalid login credentials and releases the form', async () => {
    const { page, auth } = createAdminPage();
    auth.signIn.mockResolvedValueOnce({ data: { user: null }, error: new Error('Invalid login credentials') });

    await page.submitAccess();

    expect(page.loading).toBe(false);
    expect(page.errorMessage).toMatch(/E-mail ou senha incorretos/);
  });

  it('requests a recovery email for the master account', async () => {
    const { page, auth } = createAdminPage();

    await page.requestPasswordReset();

    expect(auth.requestAdminPasswordReset).toHaveBeenCalledWith('orange.goncalves@gmail.com', '');
    expect(page.loading).toBe(false);
    expect(page.notice).toMatch(/link de recuperação/);
  });

  it('updates the password after confirmation and loads the admin panel', async () => {
    const { page, auth, readerData } = createAdminPage();
    auth.passwordRecovery.set(true);
    page.newPassword = 'strong-password-123';
    page.confirmPassword = page.newPassword;

    await page.completePasswordRecovery();

    expect(auth.updatePassword).toHaveBeenCalledWith('strong-password-123');
    expect(page.passwordRecovery()).toBe(false);
    expect(page.authorized).toBe(true);
    expect(readerData.isPlatformAdmin).toHaveBeenCalledWith('master-user');
    expect(page.loading).toBe(false);
  });
});
