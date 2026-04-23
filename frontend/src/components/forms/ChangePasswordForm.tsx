'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ApiError } from '@/lib/api-client';
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from '@/lib/validations/change-password';

interface ApiErrorLike {
  status?: number;
  message?: string;
}

export function ChangePasswordForm() {
  const router = useRouter();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: ChangePasswordInput) => {
      return apiClient.post('/api/auth/change-password', {
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      });
    },
    onSuccess: () => {
      toast.success('Password updated successfully');
      router.push('/dashboard');
    },
    onError: (error: unknown) => {
      const err = error as ApiErrorLike;
      if (err?.status === 401) {
        setError('currentPassword', {
          type: 'server',
          message: 'Current password is incorrect',
        });
        return;
      }
      const message =
        (error instanceof ApiError && error.message) ||
        err?.message ||
        'Failed to update password';
      toast.error(message);
    },
  });

  const onSubmit = (data: ChangePasswordInput) => {
    mutation.mutate(data);
  };

  const pending = isSubmitting || mutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label
          htmlFor="currentPassword"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Current Password
        </label>
        <div className="relative">
          <input
            id="currentPassword"
            type={showCurrent ? 'text' : 'password'}
            autoComplete="current-password"
            aria-invalid={!!errors.currentPassword}
            {...register('currentPassword')}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            aria-label={showCurrent ? 'Hide password' : 'Show password'}
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.currentPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.currentPassword.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="newPassword"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          New Password
        </label>
        <div className="relative">
          <input
            id="newPassword"
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            {...register('newPassword')}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            aria-label={showNew ? 'Hide password' : 'Show password'}
            onClick={() => setShowNew((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.newPassword ? (
          <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">
            Minimum 8 characters, must include 1 uppercase letter and 1 number.
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmNewPassword"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Confirm New Password
        </label>
        <div className="relative">
          <input
            id="confirmNewPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={!!errors.confirmNewPassword}
            {...register('confirmNewPassword')}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmNewPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.confirmNewPassword.message}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={pending}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </form>
  );
}
