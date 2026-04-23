'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient, ApiError } from '@/lib/api-client';

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [tokenError, setTokenError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordForm) => {
      return apiClient.post('/api/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      toast.success('Password reset successfully. Please sign in with your new password.');
      router.push('/login');
    },
    onError: (error: unknown) => {
      const err = error as ApiError | { status?: number; message?: string };
      const status = (err as { status?: number })?.status;
      if (status === 400 || status === 410) {
        setTokenError(
          'This reset link is invalid or has expired. Request a new one.'
        );
      } else {
        toast.error('Unable to reset password. Please try again.');
      }
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Invalid link</h1>
            <p className="mt-2 text-sm text-gray-600">
              This password reset link is missing a token or is malformed.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-block font-medium text-indigo-600 hover:text-indigo-500"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = (data: ResetPasswordForm) => {
    setTokenError(null);
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
            <p className="mt-2 text-sm text-gray-600">
              Choose a new password for your account.
            </p>
          </div>

          {tokenError && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <p>{tokenError}</p>
              <Link
                href="/forgot-password"
                className="mt-2 inline-block font-medium text-red-800 underline hover:text-red-900"
              >
                Request a new reset link
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.newPassword}
                aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
                disabled={mutation.isPending}
                {...register('newPassword')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {errors.newPassword && (
                <p
                  id="newPassword-error"
                  role="alert"
                  className="mt-1 text-sm text-red-600"
                >
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={
                  errors.confirmPassword ? 'confirmPassword-error' : undefined
                }
                disabled={mutation.isPending}
                {...register('confirmPassword')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {errors.confirmPassword && (
                <p
                  id="confirmPassword-error"
                  role="alert"
                  className="mt-1 text-sm text-red-600"
                >
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              aria-busy={mutation.isPending}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? 'Resetting…' : 'Reset password'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link
              href="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-sm text-gray-500">Loading…</div>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
