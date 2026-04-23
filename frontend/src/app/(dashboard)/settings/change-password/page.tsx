import type { Metadata } from 'next';
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm';

export const metadata: Metadata = {
  title: 'Change Password | LocalChat',
};

export default function ChangePasswordPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Change Password</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update your account password. You&apos;ll remain signed in on this device.
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
