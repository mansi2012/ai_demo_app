'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import SocialLoginButtons from '@/components/auth/SocialLoginButtons';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const data = await apiClient.post<{ accessToken: string; user: Record<string, unknown> }>(
        '/auth/login',
        values
      );
      setAuth({ accessToken: data.accessToken, user: data.user });
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid email or password. Please try again.';
      setError('root', { message });
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12'>
      <div className='w-full max-w-md'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-2xl font-bold text-brand-700'>Sign In</h1>
          <p className='mt-2 text-sm text-slate-500'>Welcome back — sign in to your account</p>
        </div>

        {/* Card */}
        <div className='card bg-white shadow-sm rounded-xl p-8'>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Root / server error */}
            {errors.root && (
              <div
                className='mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3'
                role='alert'
                aria-live='polite'
              >
                <p className='text-sm text-rose-700'>{errors.root.message}</p>
              </div>
            )}

            {/* Email field */}
            <div className='mb-4'>
              <label htmlFor='email' className='form-label block text-sm font-medium text-slate-700 mb-1'>
                Email address
              </label>
              <input
                id='email'
                type='email'
                autoComplete='email'
                required
                disabled={isSubmitting}
                className={`form-input w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 transition-colors ${
                  errors.email
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
                placeholder='you@example.com'
                {...register('email')}
              />
              {errors.email && (
                <p className='form-error mt-1 text-xs text-rose-600' role='alert'>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className='mb-2'>
              <div className='flex items-center justify-between mb-1'>
                <label
                  htmlFor='password'
                  className='form-label block text-sm font-medium text-slate-700'
                >
                  Password
                </label>
                <Link
                  href='/forgot-password'
                  className='text-xs text-brand-600 hover:text-brand-700 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500 rounded'
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id='password'
                type='password'
                autoComplete='current-password'
                required
                disabled={isSubmitting}
                className={`form-input w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 transition-colors ${
                  errors.password
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
                placeholder='Enter your password'
                {...register('password')}
              />
              {errors.password && (
                <p className='form-error mt-1 text-xs text-rose-600' role='alert'>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit button */}
            <div className='mt-6'>
              <button
                type='submit'
                disabled={isSubmitting}
                className='btn-primary w-full rounded-lg py-2.5 px-4 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className='animate-spin h-4 w-4 text-white'
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                      aria-hidden='true'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      />
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z'
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            {/* Social login buttons — below submit, above sign-up link */}
            <SocialLoginButtons />
          </form>

          {/* Footer sign-up link */}
          <p className='mt-6 text-center text-sm text-slate-500'>
            Don&apos;t have an account?{' '}
            <Link
              href='/register'
              className='font-medium text-brand-600 hover:text-brand-700 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500 rounded'
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
