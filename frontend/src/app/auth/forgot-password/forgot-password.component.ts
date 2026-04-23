import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ApiError {
  success: false;
  message: string;
  details?: { field: string; message: string }[];
}

interface ApiSuccess {
  success: true;
  data: { message: string };
}

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './forgot-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  submitted = signal(false);
  serverError = signal('');
  loading = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.serverError.set('');
    const payload = { email: this.form.getRawValue().email };
    this.http
      .post<ApiSuccess>(`${environment.apiUrl}/api/auth/forgot-password`, payload)
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.submitted.set(true);
        },
        error: (err: { error: ApiError }) => {
          this.loading.set(false);
          const details = err.error?.details ?? [];
          details.forEach((d) => {
            const ctrl = this.form.get(d.field);
            if (ctrl) {
              ctrl.setErrors({ serverError: d.message });
            }
          });
          if (!details.length) {
            this.serverError.set(err.error?.message ?? 'An error occurred. Please try again.');
          }
        }
      });
  }
}
