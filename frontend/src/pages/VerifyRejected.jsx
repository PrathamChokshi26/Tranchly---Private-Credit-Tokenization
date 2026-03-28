import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle, Mail } from 'lucide-react';

export default function VerifyRejected() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">T</div>
            <span className="text-xl font-bold text-gray-900">Tranchly</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border p-8 text-center">
          <XCircle size={56} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Unsuccessful</h1>
          <p className="text-gray-500 leading-relaxed">
            Your identity verification was unsuccessful. This may be due to document quality or a mismatch in your information.
          </p>
          
          <div className="mt-6 bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-2">Need help? Contact our support team:</p>
            <a href="mailto:hello@tranchly.finance" className="inline-flex items-center gap-2 text-purple-600 font-semibold hover:underline">
              <Mail size={16} /> hello@tranchly.finance
            </a>
          </div>

          <div className="mt-6 flex gap-3">
            <Link to="/verify-identity" className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700">
              Try Again
            </Link>
            <Link to="/" className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
