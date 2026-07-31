import { supabase } from '../supabase';
import { injectCastleSceneCss, buildHallScene } from '../ui/castleTheme';

type AuthCallbacks = {
  onAuthed: (username: string, accessToken: string) => void;
  onShowLogin?: () => void;
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export class AuthUI {
  private el: HTMLElement;

  constructor(container: HTMLElement, private cb: AuthCallbacks) {
    injectCastleSceneCss();
    this.el = document.createElement('div');
    this.el.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#12141b;z-index:200;font-family:"VT323",monospace;color:var(--px-text)';
    container.appendChild(this.el);
    this.checkSession();
  }

  private async checkSession(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase.from('profiles').select('username').eq('user_id', session.user.id).single();
      if (profile) { this.cb.onAuthed(profile.username, session.access_token); return; }
    }
    this.showLogin();
  }

  private showLogin(error = ''): void {
    this.el.innerHTML = `
      <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">${buildHallScene('au')}</div>
      <div style="text-align:center;position:relative;z-index:1">
        <h1 class="px-title" style="font-size:28px;margin-bottom:8px">BLOODMOOR</h1>
        <p class="px-label" style="margin-bottom:6px">Arena PvP</p>
        <p style="font-family:'VT323',monospace;font-style:italic;color:#9aa0ae;font-size:16px;letter-spacing:0.1em;padding-left:0.1em;margin-bottom:36px">Enter the blood-soaked arena</p>
        <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);margin:0 auto 28px;position:relative">
          <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:0.5rem;color:var(--px-accent);background:var(--px-bg);padding:0 8px">◆</span>
        </div>
      </div>
      <div style="text-align:center;max-width:300px;width:100%;padding:0 24px;position:relative;z-index:1">
        ${error ? `<p style="color:var(--px-danger);font-size:16px;margin-bottom:16px">${esc(error)}</p>` : ''}
        <div style="margin-bottom:10px">
          <span class="px-label" style="display:block;margin-bottom:4px;text-align:left">Email</span>
          <input id="auth-email" type="email" placeholder="Email" class="px-input" style="width:100%;margin-bottom:12px">
        </div>
        <div style="margin-bottom:12px">
          <span class="px-label" style="display:block;margin-bottom:4px;text-align:left">Password</span>
          <input id="auth-password" type="password" placeholder="Password" class="px-input" style="width:100%;margin-bottom:12px">
        </div>
        <button id="auth-signin" class="px-btn px-btn-primary" style="width:100%;margin-bottom:12px">ENTER THE ARENA</button>
        <button id="auth-register" class="px-btn" style="width:100%">Create Account</button>
      </div>
    `;
    this.el.querySelector('#auth-signin')!.addEventListener('click', () => this.handleSignIn());
    this.el.querySelector('#auth-register')!.addEventListener('click', () => this.showRegister());
    this.cb.onShowLogin?.();
  }

  private showRegister(error = ''): void {
    this.el.innerHTML = `
      <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">${buildHallScene('au')}</div>
      <div style="text-align:center;position:relative;z-index:1">
        <h1 class="px-title" style="font-size:22px;margin-bottom:8px">CREATE ACCOUNT</h1>
        <p style="font-family:'VT323',monospace;font-style:italic;color:#9aa0ae;font-size:16px;letter-spacing:0.1em;padding-left:0.1em;margin-bottom:28px">Join the arena</p>
        <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);margin:0 auto 24px;position:relative">
          <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:0.5rem;color:var(--px-accent);background:var(--px-bg);padding:0 8px">◆</span>
        </div>
      </div>
      <div style="text-align:center;max-width:300px;width:100%;padding:0 24px;position:relative;z-index:1">
        ${error ? `<p style="color:var(--px-danger);font-size:16px;margin-bottom:16px">${esc(error)}</p>` : ''}
        <div style="margin-bottom:10px">
          <span class="px-label" style="display:block;margin-bottom:4px;text-align:left">Username</span>
          <input id="auth-username" placeholder="Username" class="px-input" style="width:100%;margin-bottom:12px">
        </div>
        <div style="margin-bottom:10px">
          <span class="px-label" style="display:block;margin-bottom:4px;text-align:left">Email</span>
          <input id="auth-email" type="email" placeholder="Email" class="px-input" style="width:100%;margin-bottom:12px">
        </div>
        <div style="margin-bottom:12px">
          <span class="px-label" style="display:block;margin-bottom:4px;text-align:left">Password</span>
          <input id="auth-password" type="password" placeholder="Password" class="px-input" style="width:100%;margin-bottom:12px">
        </div>
        <button id="auth-submit" class="px-btn px-btn-primary" style="width:100%;margin-bottom:12px">FORGE YOUR LEGACY</button>
        <button id="auth-back" class="px-btn" style="width:100%">Back</button>
      </div>
    `;
    this.el.querySelector('#auth-submit')!.addEventListener('click', () => this.handleRegister());
    this.el.querySelector('#auth-back')!.addEventListener('click', () => this.showLogin());
  }

  private async handleSignIn(): Promise<void> {
    const email    = (this.el.querySelector('#auth-email') as HTMLInputElement).value.trim();
    const password = (this.el.querySelector('#auth-password') as HTMLInputElement).value;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) { this.showLogin(error?.message ?? 'Sign in failed'); return; }
    const { data: profile } = await supabase.from('profiles').select('username').eq('user_id', data.user.id).single();
    this.cb.onAuthed(profile?.username ?? email, data.session.access_token);
  }

  private async handleRegister(): Promise<void> {
    const username = (this.el.querySelector('#auth-username') as HTMLInputElement).value.trim();
    const email    = (this.el.querySelector('#auth-email') as HTMLInputElement).value.trim();
    const password = (this.el.querySelector('#auth-password') as HTMLInputElement).value;
    if (!username) { this.showRegister('Username is required'); return; }
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username } },
    });
    if (error || !data.session) { this.showRegister(error?.message ?? 'Registration failed'); return; }
    this.cb.onAuthed(username, data.session.access_token);
  }

  hide(): void { this.el.style.display = 'none'; }
  show(): void { this.el.style.display = 'flex'; }
}
