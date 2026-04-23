'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import SocialLoginButtons from '@/components/auth/SocialLoginButtons';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      return apiClient.post<LoginResponse>('/auth/login', values);
    },
    onSuccess: (data) => {
      setAuth({ accessToken: data.accessToken, user: data.user });
      router.push('/dashboard');
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Invalid email or password';
      setError('root', { message });
    },
  });

  const onSubmit = handleSubmit((values) => loginMutation.mutate(values));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Sign in to LocalChat</h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back. Please enter your details.
            </p>
          </div>

          <SocialLoginButtons />

          <div className="my-6 flex items-center gap-3" role="separator" aria-label="Or continue with email">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs uppercase tracking-wide text-gray-500">
              Or continue with email
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="mt-1 block w-full h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="mt-1 block w-full h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {errors.root?.message && (
              <p className="text-sm text-red-600">{errors.root.message}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || loginMutation.isPending}
              className="w-full inline-flex items-center justify-center h-11 px-4 rounded-lg bg-gray-900 text-white text-sm font-medium shadow-sm transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting || loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-gray-900 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
