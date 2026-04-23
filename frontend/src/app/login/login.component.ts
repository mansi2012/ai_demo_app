import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly emailError = computed(() => {
    const ctrl = this.loginForm.controls.email;
    if (ctrl.valid || ctrl.pristine) return null;
    if (ctrl.errors?.['required']) return 'Email is required.';
    if (ctrl.errors?.['email']) return 'Please enter a valid email address.';
    if (ctrl.errors?.['serverError']) return ctrl.errors['serverError'] as string;
    return null;
  });

  readonly passwordError = computed(() => {
    const ctrl = this.loginForm.controls.password;
    if (ctrl.valid || ctrl.pristine) return null;
    if (ctrl.errors?.['required']) return 'Password is required.';
    if (ctrl.errors?.['minlength']) return 'Password must be at least 6 characters.';
    if (ctrl.errors?.['serverError']) return ctrl.errors['serverError'] as string;
    return null;
  });

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.getRawValue();

    this.auth.login({ email, password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: { message?: string; details?: { field: string; message: string }[] }) => {
        this.loading.set(false);
        this.errorMessage.set(err.message ?? 'Login failed. Please try again.');

        if (err.details?.length) {
          err.details.forEach((detail) => {
            const ctrl: AbstractControl | null = this.loginForm.get(detail.field);
            if (ctrl) {
              ctrl.setErrors({ serverError: detail.message });
            }
          });
        }
      },
    });
  }
}
