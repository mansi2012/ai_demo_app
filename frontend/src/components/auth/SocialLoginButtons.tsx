'use client';

import React from 'react';

type SocialLoginButtonsProps = {
  className?: string;
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"
      />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M22 12.06C22 6.5 17.523 2 12 2S2 6.5 2 12.06C2 17.08 5.657 21.245 10.438 22v-7.03H7.898v-2.91h2.54V9.85c0-2.51 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.774-1.63 1.568v1.877h2.773l-.443 2.91h-2.33V22C18.343 21.245 22 17.08 22 12.06z" />
    </svg>
  );
}

export function SocialLoginButtons({ className }: SocialLoginButtonsProps) {
  return (
    <div className={['flex flex-col gap-3 w-full', className ?? ''].join(' ').trim()}>
      <button
        type="button"
        disabled
        aria-label="Sign in with Google"
        aria-disabled="true"
        title="Social login coming soon"
        className="w-full inline-flex items-center justify-center gap-3 h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <GoogleIcon className="h-5 w-5" />
        <span>Continue with Google</span>
      </button>

      <button
        type="button"
        disabled
        aria-label="Sign in with Facebook"
        aria-disabled="true"
        title="Social login coming soon"
        className="w-full inline-flex items-center justify-center gap-3 h-11 px-4 rounded-lg border border-transparent bg-[#1877F2] text-white text-sm font-medium shadow-sm transition-colors hover:bg-[#166FE5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877F2] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <FacebookIcon className="h-5 w-5 text-white" />
        <span>Continue with Facebook</span>
      </button>
    </div>
  );
}

export default SocialLoginButtons;
