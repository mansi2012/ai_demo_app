import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from '../../../core/services/auth.service';
import { LoginPayload } from '../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly matIconRegistry = inject(MatIconRegistry);
  private readonly domSanitizer = inject(DomSanitizer);

  readonly isLoading = signal(false);
  readonly globalError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor() {
    this.matIconRegistry.addSvgIconLiteral(
      'google',
      this.domSanitizer.bypassSecurityTrustHtml(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.84l6.09-6.09C34.46 3.39 29.5 1.5 24 1.5 14.82 1.5 7.01 7.1 3.64 15.01l7.08 5.5C12.4 14.09 17.73 9.5 24 9.5z"/><path fill="#4285F4" d="M46.15 24.5c0-1.57-.14-3.09-.4-4.55H24v8.61h12.44c-.54 2.9-2.18 5.36-4.64 7.01l7.1 5.52C42.99 37.36 46.15 31.36 46.15 24.5z"/><path fill="#FBBC05" d="M10.72 28.51A14.55 14.55 0 0 1 9.5 24c0-1.57.27-3.09.72-4.51l-7.08-5.5A22.47 22.47 0 0 0 1.5 24c0 3.61.86 7.02 2.64 10.01l6.58-5.5z"/><path fill="#34A853" d="M24 46.5c5.5 0 10.13-1.82 13.5-4.94l-7.1-5.52c-1.82 1.22-4.15 1.96-6.4 1.96-6.27 0-11.6-4.59-13.28-10.99l-6.58 5.5C7.01 40.9 14.82 46.5 24 46.5z"/><path fill="none" d="M1.5 1.5h45v45h-45z"/></svg>'
      )
    );

    this.matIconRegistry.addSvgIconLiteral(
      'facebook',
      this.domSanitizer.bypassSecurityTrustHtml(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#1877F2" d="M48 24C48 10.74 37.26 0 24 0S0 10.74 0 24c0 11.98 8.77 21.9 20.25 23.71V30.94h-6.09V24h6.09v-5.29c0-6.02 3.58-9.34 9.07-9.34 2.63 0 5.38.47 5.38.47v5.92h-3.03c-2.98 0-3.91 1.85-3.91 3.75V24h6.66l-1.06 6.94H27.76v16.77C39.23 45.9 48 35.98 48 24z"/><path fill="#fff" d="M33.36 30.94l1.06-6.94h-6.66v-4.49c0-1.9.93-3.75 3.91-3.75h3.03v-5.92s-2.75-.47-5.38-.47c-5.49 0-9.07 3.32-9.07 9.34V24h-6.09v6.94h6.09v16.77a24.14 24.14 0 0 0 7.5 0V30.94h5.61z"/></svg>'
      )
    );
  }

  onSocialLoginClick(provider: string): void {
    /* placeholder — no logic yet */
  }

  get emailControl() {
    return this.form.controls.email;
  }

  get passwordControl() {
    return this.form.controls.password;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.globalError.set(null);

    const payload: LoginPayload = this.form.getRawValue();

    this.auth.login(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: { message?: string; details?: Array<{ field: string; message: string }> }) => {
        this.isLoading.set(false);
        this.globalError.set(err.message ?? 'Login failed. Please try again.');

        if (err.details && Array.isArray(err.details)) {
          for (const detail of err.details) {
            const control = this.form.get(detail.field);
            if (control) {
              control.setErrors({ serverError: detail.message });
            }
          }
        }
      }
    });
  }
}
