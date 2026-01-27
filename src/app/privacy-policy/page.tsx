
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-4">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p>
            Welcome to Blistree Tokens ("we," "our," "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.
          </p>

          <h2 className="text-xl font-semibold">2. Information We Collect</h2>
          <p>
            We may collect information about you in a variety of ways. The information we may collect on the Application includes:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and telephone number, that you voluntarily give to us when you register with the Application.
            </li>
            <li>
              <strong>Financial Data:</strong> We do not collect any financial information, such as data related to your payment method (e.g., valid credit card number, card brand, expiration date).
            </li>
             <li>
              <strong>Transaction Data:</strong> We collect data about your coin transfers, including sender and receiver information, amounts, and timestamps.
            </li>
          </ul>

          <h2 className="text-xl font-semibold">3. Use of Your Information</h2>
          <p>
            Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to:
          </p>
           <ul className="list-disc pl-6 space-y-2">
            <li>Create and manage your account.</li>
            <li>Email you regarding your account or order.</li>
            <li>Enable user-to-user communications.</li>
            <li>Monitor and analyze usage and trends to improve your experience with the Application.</li>
            <li>Notify you of updates to the Application.</li>
            <li>Process transactions and send you related information, including confirmations and invoices.</li>
          </ul>

          <h2 className="text-xl font-semibold">4. Disclosure of Your Information</h2>
          <p>
            We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
          </p>
           <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.
            </li>
            <li>
              <strong>Third-Party Service Providers:</strong> We do not share your information with third-party service providers.
            </li>
          </ul>

          <h2 className="text-xl font-semibold">5. Security of Your Information</h2>
          <p>
            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
          </p>

          <h2 className="text-xl font-semibold">6. Your Data Rights & Deletion</h2>
          <p>
            You have the right to request the deletion of some or all of your personal data that we store. To make such a request, please contact us using the contact information provided below. Please note that we may need to retain certain information for record-keeping purposes, to complete transactions, or when required by law.
          </p>
          
          <h2 className="text-xl font-semibold">7. Contact Us</h2>
          <p>
            If you have questions or comments about this Privacy Policy, or if you wish to make a data deletion request, please contact us at: sakshamyadav071@gmail.com
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
