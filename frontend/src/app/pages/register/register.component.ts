import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { AuthShellComponent } from '../../shared/auth-shell.component';
import { ApiErrorBody } from '../../core/models/user.model';

type FieldName = 'firstName' | 'lastName' | 'username' | 'email' | 'password';

@Component({
  selector: 'app-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthShellComponent],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly fieldErrors = signal<Partial<Record<FieldName, string>>>({});

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
        Validators.pattern(/^[a-zA-Z0-9_.-]+$/),
      ],
    ],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(128)],
    ],
  });

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.serverError.set(null);
    this.fieldErrors.set({});

    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/home']),
      error: (err: HttpErrorResponse) => {
        const body = err.error as ApiErrorBody | null;
        const perField: Partial<Record<FieldName, string>> = {};
        body?.details?.forEach((d) => {
          perField[d.field as FieldName] = d.message;
        });
        this.fieldErrors.set(perField);
        this.serverError.set(body?.message ?? 'Registration failed. Please try again.');
        this.submitting.set(false);
      },
    });
  }

  controlError(name: FieldName): string | null {
    const server = this.fieldErrors()[name];
    if (server) return server;

    const c = this.form.controls[name];
    if (!(c.invalid && (c.dirty || c.touched))) return null;

    if (c.hasError('required')) return 'This field is required.';
    if (c.hasError('email')) return 'Please enter a valid email address.';
    if (c.hasError('minlength')) {
      const req = c.getError('minlength').requiredLength;
      return `Must be at least ${req} characters.`;
    }
    if (c.hasError('maxlength')) {
      const req = c.getError('maxlength').requiredLength;
      return `Must be at most ${req} characters.`;
    }
    if (c.hasError('pattern')) {
      return 'Only letters, numbers, and . _ - are allowed.';
    }
    return 'Invalid value.';
  }
}
