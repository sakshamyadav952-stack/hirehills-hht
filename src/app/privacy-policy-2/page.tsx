
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicy2Page() {
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy – Crush Oracle</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-4">
          <p>Last Updated: 24 November 2025</p>
          <p>
            Crush Oracle (“we”, “our”, or “us”) is committed to protecting your privacy. This Privacy Policy explains what information our app collects, how we use it, and your rights.
          </p>

          <h2 className="text-xl font-semibold">1. Information We Collect</h2>
          <p>
            Crush Oracle is designed to be simple and interactive. We do not collect any personally identifiable information such as your name, email, phone number, or address.
          </p>
          <p>
            However, to provide basic app functionality, we may collect:
          </p>
          <h3 className="text-lg font-semibold">a. Device Information</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Device type</li>
            <li>App version</li>
            <li>Operating system</li>
          </ul>
          <p className="text-sm text-muted-foreground">(Automatically collected to improve performance and fix issues)</p>
          
          <h3 className="text-lg font-semibold">b. Non-Personal Usage Data</h3>
           <ul className="list-disc pl-6 space-y-1">
            <li>Feature usage</li>
            <li>Basic analytics</li>
          </ul>
          <p className="text-sm text-muted-foreground">(This helps us understand how users interact with the app.)</p>

          <h3 className="text-lg font-semibold">c. User-Provided Inputs</h3>
           <ul className="list-disc pl-6 space-y-1">
            <li>If you enter information inside the app (e.g., names or text), it stays only on your device.</li>
            <li>We do not store, upload, or share this information.</li>
          </ul>

          <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
          <p>
            We use the collected non-personal information for:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Improving app performance</li>
            <li>Fixing bugs</li>
            <li>Enhancing app features</li>
            <li>Basic analytics</li>
          </ul>
          <p>
            We do not sell, rent, or share your information with any third party.
          </p>

          <h2 className="text-xl font-semibold">3. Third-Party Services</h2>
          <p>
            Crush Oracle may use trusted third-party services such as:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Google Play Services</li>
            <li>Ad services (if enabled)</li>
          </ul>
          <p>
            These services may collect limited data as per their own privacy policies. We recommend reviewing their policies.
          </p>

          <h2 className="text-xl font-semibold">4. Data Security</h2>
          <p>
            We take reasonable measures to ensure that all non-personal data is protected. Since no user accounts or personal identifiers are collected, the risk is minimal.
          </p>

          <h2 className="text-xl font-semibold">5. Children’s Privacy</h2>
          <p>
            Crush Oracle is not intended for children under the age of 13. We do not knowingly collect personal information from children.
          </p>

          <h2 className="text-xl font-semibold">6. Your Choices</h2>
          <p>
            Since we do not collect personal information:
          </p>
           <ul className="list-disc pl-6 space-y-2">
            <li>No data deletion request is required</li>
            <li>No account data exists on our servers</li>
          </ul>
          <p>
            You may uninstall the app at any time to remove all local data.
          </p>
          
          <h2 className="text-xl font-semibold">7. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The updated version will be available on this page.
          </p>

          <h2 className="text-xl font-semibold">8. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, you can contact us at:
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
