import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';

interface TurnstileParameters {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, parameters: TurnstileParameters): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileApiPromise: Promise<TurnstileApi> | null = null;

export function captchaIsComplete(siteKey: string, token: string): boolean {
  return siteKey.trim().length === 0 || token.trim().length > 0;
}

function loadTurnstileApi(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileApiPromise) return turnstileApiPromise;

  turnstileApiPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile não carregou.'));
    script.onerror = () => reject(new Error('Não foi possível carregar a verificação anti-robô.'));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    turnstileApiPromise = null;
    throw error;
  });

  return turnstileApiPromise;
}

@Component({
  selector: 'app-turnstile-widget',
  standalone: true,
  template: `
    <div #container class="turnstile-container" aria-label="Verificação contra robôs"></div>
    @if (errorMessage) { <p class="turnstile-error" role="alert">{{ errorMessage }}</p> }
  `,
  styles: [
    '.turnstile-container:empty { display: none; }',
    '.turnstile-error { margin: .4rem 0; color: #9c3434; font-size: .82rem; }',
  ],
})
export class TurnstileWidget implements AfterViewInit, OnDestroy {
  @Input() siteKey = '';
  @Output() tokenChange = new EventEmitter<string>();
  @ViewChild('container', { static: true }) private container!: ElementRef<HTMLElement>;

  errorMessage = '';
  private widgetId: string | null = null;
  private destroyed = false;

  async ngAfterViewInit(): Promise<void> {
    if (!this.siteKey.trim()) return;
    try {
      const turnstile = await loadTurnstileApi();
      if (this.destroyed) return;
      this.widgetId = turnstile.render(this.container.nativeElement, {
        sitekey: this.siteKey,
        callback: (token) => {
          this.errorMessage = '';
          this.tokenChange.emit(token);
        },
        'expired-callback': () => this.tokenChange.emit(''),
        'error-callback': () => {
          this.tokenChange.emit('');
          this.errorMessage = 'A verificação expirou ou falhou. Tente novamente.';
        },
      });
    } catch {
      this.errorMessage = 'Não foi possível carregar a verificação anti-robô.';
    }
  }

  reset(): void {
    this.tokenChange.emit('');
    if (this.widgetId) window.turnstile?.reset(this.widgetId);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.widgetId) window.turnstile?.remove(this.widgetId);
  }
}
