export default function VerifyEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We&apos;ve sent you a verification link. Please check your email and click the link to activate your account.
          </p>
        </div>
        <div className="text-center">
          <a
            href="/auth/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Back to login
          </a>
        </div>
      </div>
    </div>
  )
}
