import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-brand-50">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white text-xl font-bold">
            S
          </div>
          <h1 class="mt-4 text-2xl font-semibold text-slate-900">{{ title() }}</h1>
          <p class="mt-1 text-sm text-slate-500">{{ subtitle() }}</p>
        </div>
        <div class="card p-6 sm:p-8">
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class AuthShellComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
