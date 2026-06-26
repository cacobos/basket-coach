import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, NgIf],
  template: `
    <div class="login-page">
      <main class="login-card">
        <header class="login-header">
          <div class="logo-row">
            <svg class="hoop-icon" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="20" r="14" stroke="#1a237e" stroke-width="2" fill="none"/>
              <line x1="24" y1="10" x2="24" y2="6" stroke="#1a237e" stroke-width="2"/>
              <line x1="18" y1="6" x2="30" y2="6" stroke="#1a237e" stroke-width="2"/>
              <rect x="21" y="20" width="6" height="18" fill="#1a237e" rx="1"/>
              <rect x="26" y="34" width="12" height="4" fill="#1a237e" rx="1"/>
              <rect x="10" y="34" width="12" height="4" fill="#1a237e" rx="1"/>
            </svg>
            <h1>BasketFlow</h1>
          </div>
          <p class="subtitle">Entrenamiento inteligente para tu equipo</p>
        </header>

        <div *ngIf="!isSignUp" class="login-form">
          <button class="btn-google" (click)="signInGoogle()">
            <svg class="google-icon" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Continuar con Google</span>
          </button>

          <div class="divider">
            <span></span><span>o</span><span></span>
          </div>

          <div class="input-group">
            <div class="input-wrapper">
              <span class="material-symbols-outlined">mail</span>
              <input type="email" placeholder="Correo electrónico" [(ngModel)]="email" />
            </div>
          </div>

          <div class="input-group">
            <div class="input-wrapper">
              <span class="material-symbols-outlined">lock</span>
              <input type="password" placeholder="Contraseña" [(ngModel)]="password" />
            </div>
          </div>

          <button class="btn-primary" (click)="signIn()">
            Iniciar sesión
          </button>

          <p class="switch">
            ¿No tienes cuenta? <a (click)="toggleMode()">Regístrate</a>
          </p>
        </div>

        <div *ngIf="isSignUp" class="login-form">
          <div class="input-group">
            <div class="input-wrapper">
              <span class="material-symbols-outlined">person</span>
              <input type="text" placeholder="Nombre completo" [(ngModel)]="fullName" />
            </div>
          </div>

          <div class="input-group">
            <div class="input-wrapper">
              <span class="material-symbols-outlined">mail</span>
              <input type="email" placeholder="Correo electrónico" [(ngModel)]="email" />
            </div>
          </div>

          <div class="input-group">
            <div class="input-wrapper">
              <span class="material-symbols-outlined">lock</span>
              <input type="password" placeholder="Contraseña (mín. 6 caracteres)" [(ngModel)]="password" />
            </div>
          </div>

          <button class="btn-primary" (click)="signUp()">
            Crear cuenta
          </button>

          <p class="switch">
            ¿Ya tienes cuenta? <a (click)="toggleMode()">Inicia sesión</a>
          </p>
        </div>

        <p *ngIf="message" class="message">{{ message }}</p>
      </main>

      <footer class="login-footer">
        <p>© 2026 BasketFlow. Todos los derechos reservados.</p>
      </footer>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
      padding: 24px;
      font-family: 'Work Sans', sans-serif;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      background: #ffffff;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05), 0 8px 24px rgba(26,35,126,0.1);
    }

    .login-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 32px;
      text-align: center;
    }

    .logo-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .hoop-icon {
      width: 48px;
      height: 48px;
    }

    .logo-row h1 {
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #1a237e;
      margin: 0;
    }

    .subtitle {
      font-size: 14px;
      line-height: 20px;
      color: #454652;
      margin: 0;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .btn-google {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      height: 44px;
      background: #ffffff;
      border: 1px solid #c6c5d4;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      color: #454652;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-google:hover {
      background: #f5f3f3;
    }

    .google-icon {
      width: 20px;
      height: 20px;
    }

    .divider {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #767683;
    }

    .divider span:first-child,
    .divider span:last-child {
      flex: 1;
      height: 1px;
      background: #c6c5d4;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .input-wrapper {
      display: flex;
      align-items: center;
      height: 44px;
      border: 1px solid #c6c5d4;
      border-radius: 8px;
      background: #f5f3f3;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .input-wrapper:focus-within {
      border-color: #2b5bb5;
      box-shadow: 0 0 0 2px rgba(43,91,181,0.1);
    }

    .input-wrapper .material-symbols-outlined {
      margin-left: 12px;
      font-size: 20px;
      color: #454652;
    }

    .input-wrapper input {
      width: 100%;
      height: 100%;
      background: transparent;
      border: none;
      outline: none;
      padding: 0 12px;
      font-size: 14px;
      color: #1b1c1c;
      font-family: 'Work Sans', sans-serif;
    }

    .input-wrapper input::placeholder {
      color: #767683;
    }

    .btn-primary {
      width: 100%;
      height: 44px;
      background: #1a237e;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
      font-family: 'Hanken Grotesk', sans-serif;
    }

    .btn-primary:hover {
      opacity: 0.9;
    }

    .btn-primary:active {
      transform: scale(0.98);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .switch {
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      color: #454652;
      margin: 8px 0 0;
    }

    .switch a {
      color: #2b5bb5;
      cursor: pointer;
      text-decoration: none;
    }

    .switch a:hover {
      text-decoration: underline;
    }

    .message {
      text-align: center;
      color: #ba1a1a;
      font-size: 13px;
      margin-top: 12px;
    }

    .login-footer {
      margin-top: 16px;
      text-align: center;
      padding: 0 16px;
    }

    .login-footer p {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.4);
      margin: 0;
    }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);

  email = '';
  password = '';
  fullName = '';
  isSignUp = false;
  message = '';

  toggleMode(): void {
    this.isSignUp = !this.isSignUp;
    this.message = '';
  }

  signInGoogle(): void {
    this.auth.signInWithGoogle();
  }

  async signIn(): Promise<void> {
    const { error } = await this.auth.signInWithEmail(this.email, this.password);
    if (error) this.message = error.message;
  }

  async signUp(): Promise<void> {
    const { error } = await this.auth.signUpWithEmail(this.email, this.password);
    if (error) {
      this.message = error.message;
    } else {
      this.message = 'Revisa tu email para verificar la cuenta.';
      this.isSignUp = false;
    }
  }
}
