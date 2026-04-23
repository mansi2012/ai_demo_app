import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
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

function passwordMatchValidator(group: AbstractControl): { mismatch: true } | null {
  const pw = group.get('newPassword')?.value as string;
  const cpw = group.get('confirmPassword')?.value as string;
  return pw === cpw ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './reset-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  token = signal<string | null>(null);
  serverError = signal('');
  invalidLink = signal(false);
  loading = signal(false);

  form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token');
    if (!t) {
      this.invalidLink.set(true);
      return;
    }
    this.token.set(t);
  }

  submit(): void {
    if (this.form.invalid || !this.token()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.serverError.set('');
    const payload = {
      token: this.token() as string,
      newPassword: this.form.getRawValue().newPassword
    };
    this.http
      .post<ApiSuccess>(`${environment.apiUrl}/api/auth/reset-password`, payload)
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/login'], { queryParams: { reset: 'success' } });
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
