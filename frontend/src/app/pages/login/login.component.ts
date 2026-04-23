import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  serverError = signal('');
  loading = signal(false);
  resetSuccess = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  ngOnInit(): void {
    const reset = this.route.snapshot.queryParamMap.get('reset');
    if (reset === 'success') {
      this.resetSuccess.set(true);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.serverError.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: { error: { message?: string; details?: { field: string; message: string }[] } }) => {
        this.loading.set(false);
        const details = err.error?.details ?? [];
        details.forEach((d) => {
          const ctrl = this.form.get(d.field);
          if (ctrl) {
            ctrl.setErrors({ serverError: d.message });
          }
        });
        if (!details.length) {
          this.serverError.set(err.error?.message ?? 'Login failed. Please try again.');
        }
      }
    });
  }
}
