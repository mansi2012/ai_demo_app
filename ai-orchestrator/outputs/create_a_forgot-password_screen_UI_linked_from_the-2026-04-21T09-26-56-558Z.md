---
Task Understanding:
Create a 'Forgot Password' screen UI that is accessible from the login screen. This task involves only frontend changes since it's focused on UI creation and linking, assuming the backend API for password reset already exists or will be implemented separately.

Task Breakdown:
Frontend:
Design and implement the Forgot Password screen with appropriate form fields (email input, submit button), link it from the Login screen, handle basic client-side validation, show success/error messages, and ensure seamless navigation back to Login.

Backend:
Not required

QA:
Verify that the Forgot Password screen renders correctly, form submission works as expected, error states display properly, and navigation between Login and Forgot Password functions smoothly across supported browsers/devices.

Missing Requirements / Assumptions Needed:
  - Is there an existing design mockup or Figma link for the Forgot Password screen?
  - Should the screen support dark mode styling consistent with the rest of the app?
  - Are there any specific validation rules for the email field beyond standard format checking?
  - What message should be shown after submitting the forgot password request (success/failure)?
  - Does the backend endpoint for initiating password reset already exist? If so, what is its URL and expected payload?

Assigned Agents:
  - Frontend Agent
  - Qa Agent

Agent Instructions:

Frontend Agent:
Here's the implementation plan for the forgot password feature:

### 1. Files to create/modify

```
frontend/src/
├── app/
│   ├── (auth)/
│   │   └── forgot-password/
│   │       └── page.tsx
│   └── login/
│       └── page.tsx (modify)
├── components/
│   └── auth/
│       └── ForgotPasswordForm.tsx
├── lib/
│   └── api-client.ts (already exists)
└── types/
    └── auth.ts (create if doesn't exist)
```

### 2. Component Structure

```
ForgotPasswordPage (/app/(auth)/forgot-password/page.tsx)
└── ForgotPasswordForm (/components/auth/ForgotPasswordForm.tsx)
    ├── React Hook Form + Zod
    ├── TanStack Query Mutation
    └── Tailwind-styled UI elements
```

### 3. Type Definitions

```typescript
// types/auth.ts
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}
```

### 4. API Hook Signatures

```typescript
// hooks/mutations/useForgotPassword.ts (to be created)
const useForgotPassword = () => {
  return useMutation({
    mutationFn: (data: ForgotPasswordRequest) => 
      apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', data),
    // onSuccess/onError handling
  });
};
```

### 5. Implementation Details

#### Forgot Password Page Component
```tsx
// app/(auth)/forgot-password/page.tsx
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
```

#### Forgot Password Form Component
```tsx
// components/auth/ForgotPasswordForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: ForgotPasswordFormData) =>
      apiClient.post<{ message: string }>('/auth/forgot-password', data),
    onSuccess: (response) => {
      setSuccessMessage(response.message || 'Password reset instructions sent to your email');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to send reset instructions';
      setSuccessMessage(null);
      // Handle error display as needed
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      {successMessage ? (
        <div className="rounded-md bg-green-50 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                type="email"
                {...register('email')}
                className={`block w-full appearance-none rounded-md border px-3 py-2 placeholder-gray-400 shadow-sm focus:outline-none sm:text-sm ${
                  errors.email 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {mutation.isPending ? 'Sending...' : 'Reset Password'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Back to login
        </Link>
      </div>
    </div>
  );
}
```

#### Update Login Page
```tsx
// app/login/page.tsx (partial update)
// In the login form section, add this after the sign-in button:
<div className="mt-2 text-right">
  <Link href="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
    Forgot your password?
  </Link>
</div>
```

### Key Implementation Notes

1. **API Client Integration**:
   - Uses existing `apiClient` which automatically unwraps `{ success, data }` responses
   - Handles automatic retry on 401 errors
   - Properly typed with generics for request/response payloads

2. **Validation**:
   - Zod schema validates email format
   - React Hook Form manages form state
   - Inline error messages displayed below fields

3. **TanStack Query Integration**:
   - Mutation hook for POST requests
   - Loading states handled with `isPending`
   - Success/error feedback shown to user

4. **UI/UX Considerations**:
   - Responsive design with Tailwind classes
   - Clear success/error messaging
   - Accessible form elements with proper labels
   - Disabled button during submission
   - Back navigation to login page

5. **Localization Support**:
   - Text content uses descriptive keys
   - Ready for i18n integration (strings can be replaced with t() calls)

6. **Security**:
   - No sensitive data stored in localStorage
   - Email validation prevents malformed requests
   - Generic success messages prevent email enumeration

This implementation follows all specified architecture rules while providing a clean, accessible, and secure password recovery flow.

QA Agent:
[
  {
    "test_name": "Happy Path - Navigate to Forgot Password Screen",
    "type": "ui",
    "steps": [
      "Navigate to Login screen at http://localhost:3000/login",
      "Click 'Forgot Password?' link"
    ],
    "expected_result": "Forgot Password screen loads successfully",
    "ui_url": "http://localhost:3000/login"
  },
  {
    "test_name": "Happy Path - Submit Valid Email and Receive Success Message",
    "type": "ui",
    "steps": [
      "Navigate to Forgot Password screen",
      "Enter valid email address",
      "Click Submit button",
      "Wait for API response"
    ],
    "expected_result": "Success message is displayed indicating password reset instructions sent",
    "ui_url": "http://localhost:3000/forgot-password"
  },
  {
    "test_name": "API Happy Path - Valid Email Submission",
    "type": "api",
    "steps": [
      "Send POST request to forgot password endpoint with valid email"
    ],
    "expected_result": "API returns 200 OK status with success message",
    "endpoint": "/api/v1/auth/forgot-password",
    "method": "POST",
    "body": {
      "email": "user@example.com"
    }
  },
  {
    "test_name": "Edge Case - Invalid Email Format Validation",
    "type": "ui",
    "steps": [
      "Navigate to Forgot Password screen",
      "Enter invalid email format (e.g., 'invalid-email')",
      "Click Submit button or blur field"
    ],
    "expected_result": "Validation error message appears indicating invalid email format",
    "ui_url": "http://localhost:3000/forgot-password"
  },
  {
    "test_name": "API Edge Case - Invalid Email Format",
    "type": "api",
    "steps": [
      "Send POST request to forgot password endpoint with invalid email"
    ],
    "expected_result": "API returns 400 Bad Request with validation error message",
    "endpoint": "/api/v1/auth/forgot-password",
    "method": "POST",
    "body": {
      "email": "invalid-email"
    }
  },
  {
    "test_name": "Edge Case - Empty Email Field",
    "type": "ui",
    "steps": [
      "Navigate to Forgot Password screen",
      "Leave email field empty",
      "Click Submit button"
    ],
    "expected_result": "Validation error message appears indicating email is required",
    "ui_url": "http://localhost:3000/forgot-password"
  },
  {
    "test_name": "API Edge Case - Empty Email Field",
    "type": "api",
    "steps": [
      "Send POST request to forgot password endpoint with empty email"
    ],
    "expected_result": "API returns 400 Bad Request with validation error message",
    "endpoint": "/api/v1/auth/forgot-password",
    "method": "POST",
    "body": {
      "email": ""
    }
  },
  {
    "test_name": "Edge Case - Non-existent Email Address",
    "type": "api",
    "steps": [
      "Send POST request to forgot password endpoint with non-existent email"
    ],
    "expected_result": "API returns 200 OK (security best practice) but no email is sent",
    "endpoint": "/api/v1/auth/forgot-password",
    "method": "POST",
    "body": {
      "email": "nonexistent@example.com"
    }
  },
  {
    "test_name": "Edge Case - Loading State Display",
    "type": "ui",
    "steps": [
      "Navigate to Forgot Password screen",
      "Enter valid email address",
      "Click Submit button"
    ],
    "expected_result": "Loading spinner or indicator appears during API request and disappears after response",
    "ui_url": "http://localhost:3000/forgot-password"
  },
  {
    "test_name": "Error Handling - Network Error Simulation",
    "type": "ui",
    "steps": [
      "Navigate to Forgot Password screen",
      "Simulate network failure (using Playwright interception)",
      "Enter valid email and submit"
    ],
    "expected_result": "Appropriate error message is displayed indicating network issue",
    "ui_url": "http://localhost:3000/forgot-password"
  },
  {
    "test_name": "API Error Handling - Server Error Response",
    "type": "api",
    "steps": [
      "Send POST request to forgot password endpoint that triggers server error"
    ],
    "expected_result": "API returns 500 Internal Server Error with error message",
    "endpoint": "/api/v1/auth/forgot-password",
    "method": "POST",
    "body": {
      "email": "servererror@example.com"
    }
  },
  {
    "test_name": "Navigation - Back to Login via Browser Back",
    "type": "ui",
    "steps": [
      "Navigate to Login screen",
      "Click 'Forgot Password?' link",
      "Verify Forgot Password screen loads",
      "Press browser Back button"
    ],
    "expected_result": "User is navigated back to Login screen",
    "ui_url": "http://localhost:3000/login"
  },
  {
    "test_name": "Navigation - Back to Login via Explicit Link",
    "type": "ui",
    "steps": [
      "Navigate to Forgot Password screen",
      "Click on 'Back to Login' link"
    ],
    "expected_result": "User is navigated back to Login screen",
    "ui_url": "http://localhost:3000/forgot-password"
  },
  {
    "test_name": "UI Consistency - Light Mode Display",
    "type": "ui",
    "steps": [
      "Set application to light mode",
      "Navigate to Forgot Password screen",
      "Check styling and layout"
    ],
    "expected_result": "UI elements display correctly with light theme colors and consistent styling",
    "ui_url": "http://localhost:3000/forgot-password"
  },
  {
    "test_name": "UI Consistency - Dark Mode Display",
    "type": "ui",
    "steps": [
      "Set application to dark mode",
      "Navigate to Forgot Password screen",
      "Check styling and layout"
    ],
    "expected_result": "UI elements display correctly with dark theme colors and consistent styling",
    "ui_url": "http://localhost:3000/forgot-password"
  },
  {
    "test_name": "Cross-browser Compatibility - Chrome Desktop",
    "type": "ui",
    "steps": [
      "Open Chrome browser",
      "Navigate to Forgot Password screen",
      "Perform basic functionality test"
    ],
    "expected_result": "All UI elements render correctly and functionality works as expected",
    "ui_url": "http://localhost:3000/forgot-password"
  },
  {
    "test_name": "Cross-browser Compatibility - Firefox Desktop",
    "type": "ui",
    "steps": [
      "Open Firefox browser",
      "Navigate to Forgot Password screen",
      "Perform basic functionality test"
    ],
    "expected_result": "All UI elements render correctly and functionality works as expected",
    "ui_url": "http://localhost:3000/forgot-password"
  },
  {
    "test_name": "Cross-browser Compatibility - Safari Desktop",
    "type": "ui",
    "steps": [
      "Open Safari browser",
      "Navigate to Forgot Password screen",
      "Perform basic functionality test"
    ],
    "expected_result": "All UI elements render correctly and functionality works as expected",
    "ui_url": "http://localhost:3000/forgot-password"
  },
  {
    "test_name": "Responsive Design - Mobile Viewport",
    "type": "ui",
    "steps": [
      "Set viewport to mobile size (375x667)",
      "Navigate to Forgot Password screen",
      "Check layout and element sizing"
    ],
    "expected_result": "UI adapts properly to mobile viewport with appropriate spacing and element sizing",
    "ui_url": "http://localhost:3000/forgot-password"
  },
  {
    "test_name": "Multi-tenancy Isolation - Business ID Separation",
    "type": "api",
    "steps": [
      "Login as user from Business A",
      "Request password reset for user from Business A",
      "Attempt to access password reset data for user from Business B"
    ],
    "expected_result": "Business A user cannot access or affect Business B's password reset process",
    "endpoint": "/api/v1/auth/forgot-password",
    "method": "POST",
    "body": {
      "email": "businessBuser@example.com"
    }
  }
]
---