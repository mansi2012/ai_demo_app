import React from 'react';

export default function SocialLoginButtons() {
  return (
    <>
      <div className='relative my-6'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t border-slate-300' />
        </div>
        <div className='relative flex justify-center text-sm'>
          <span className='bg-white px-2 text-slate-500'>or continue with</span>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        {/* Google Button */}
        <button
          type='button'
          aria-label='Sign in with Google'
          className='w-full rounded-lg py-2.5 px-4 flex items-center justify-center gap-3 text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors duration-150'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 48 48'
            width='20'
            height='20'
            aria-hidden='true'
            focusable='false'
          >
            <path
              fill='#4285F4'
              d='M46.145 24.503c0-1.63-.146-3.198-.418-4.702H24v8.892h12.418c-.536 2.888-2.166 5.337-4.615 6.98v5.798h7.474c4.372-4.027 6.868-9.956 6.868-16.968z'
            />
            <path
              fill='#34A853'
              d='M24 47c6.237 0 11.466-2.069 15.288-5.605l-7.474-5.798c-2.069 1.386-4.716 2.205-7.814 2.205-6.01 0-11.095-4.059-12.916-9.511H3.436v5.99C7.24 42.098 15.032 47 24 47z'
            />
            <path
              fill='#FBBC05'
              d='M11.084 28.291A13.977 13.977 0 0 1 10.364 24c0-1.492.256-2.942.72-4.291v-5.99H3.436A22.993 22.993 0 0 0 1 24c0 3.71.888 7.22 2.436 10.281l7.648-5.99z'
            />
            <path
              fill='#EA4335'
              d='M24 10.198c3.385 0 6.424 1.163 8.814 3.449l6.608-6.608C35.457 3.296 30.228 1 24 1 15.032 1 7.24 5.902 3.436 13.719l7.648 5.99C12.905 14.257 17.99 10.198 24 10.198z'
            />
          </svg>
          Continue with Google
        </button>

        {/* Facebook Button */}
        <button
          type='button'
          aria-label='Sign in with Facebook'
          className='w-full rounded-lg py-2.5 px-4 flex items-center justify-center gap-3 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors duration-150'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            width='20'
            height='20'
            aria-hidden='true'
            focusable='false'
            fill='white'
          >
            <path d='M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z' />
          </svg>
          Continue with Facebook
        </button>
      </div>
    </>
  );
}
