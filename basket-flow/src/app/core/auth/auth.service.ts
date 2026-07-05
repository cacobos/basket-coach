import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationService } from '../services/notification.service';
import { PermissionService } from '../services/permission.service';
import type { User, AuthError } from '@supabase/supabase-js';
import type { Profile } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User | null>(null);
  private _profile = signal<Profile | null>(null);
  private _loading = signal(false);
  private _resolveReady!: () => void;
  ready: Promise<void> = new Promise(resolve => { this._resolveReady = resolve; });

  user = this._user.asReadonly();
  profile = this._profile.asReadonly();
  loading = this._loading.asReadonly();
  isAuthenticated = computed(() => this._user() !== null);

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private notification: NotificationService,
    private permissions: PermissionService
  ) {
    this._initSession();
  }

  private async _initSession(): Promise<void> {
    const { data: { session } } = await this.supabase.client.auth.getSession();
    if (session?.user) {
      this._user.set(session.user);
      await this._loadProfile(session.user.id);
      await this.permissions.load();
    }
    this._resolveReady();

    this.supabase.client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        this._user.set(session.user);
        this._loadProfile(session.user.id);
        this.permissions.load();
        if (event === 'SIGNED_IN' && this.router.url === '/login') {
          this.router.navigate(['/dashboard']);
        }
      } else {
        this._user.set(null);
        this._profile.set(null);
      }
    });
  }

  private async _loadProfile(userId: string): Promise<void> {
    const { data } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      this._profile.set(data as Profile);
    }
  }

  async signInWithGoogle(): Promise<{ error: AuthError | null }> {
    this._loading.set(true);
    const { error } = await this.supabase.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    this._loading.set(false);
    if (error) this._handleError(error);
    return { error };
  }

  async signInWithEmail(email: string, password: string): Promise<{ error: AuthError | null }> {
    this._loading.set(true);
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    this._loading.set(false);
    if (!error) this.router.navigate(['/dashboard']);
    return { error };
  }

  async signUpWithEmail(email: string, password: string): Promise<{ error: AuthError | null }> {
    this._loading.set(true);
    const { error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    this._loading.set(false);
    return { error };
  }

  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this._user.set(null);
    this._profile.set(null);
    this.router.navigate(['/login']);
  }

  private _handleError(error: AuthError): void {
    this.notification.show(error.message);
  }
}
