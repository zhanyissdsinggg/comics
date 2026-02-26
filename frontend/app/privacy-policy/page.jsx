/* eslint-disable react/no-unescaped-entities */
import SiteHeader from "../../components/layout/SiteHeader";

export const metadata = {
  title: "Privacy Policy - Gush",
  description: "Our commitment to protecting your privacy and personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 pb-12 pt-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Last Updated: February 10, 2026
            </p>
          </div>

          {/* Introduction */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p className="text-neutral-300 leading-relaxed">
              Welcome to Gush ("we," "our," or "us"). We are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
            </p>
            <p className="text-neutral-300 leading-relaxed">
              By using our services, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-neutral-200">2.1 Personal Information</h3>
              <p className="text-neutral-300 leading-relaxed">
                We may collect personal information that you voluntarily provide to us when you:
              </p>
              <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
                <li>Register for an account</li>
                <li>Make a purchase</li>
                <li>Subscribe to our newsletter</li>
                <li>Contact customer support</li>
                <li>Participate in surveys or promotions</li>
              </ul>
              <p className="text-neutral-300 leading-relaxed">
                This information may include: name, email address, username, password, payment information, and any other information you choose to provide.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-neutral-200">2.2 Automatically Collected Information</h3>
              <p className="text-neutral-300 leading-relaxed">
                When you access our services, we automatically collect certain information, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data (pages visited, time spent, click patterns)</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Location data (with your permission)</li>
              </ul>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
            <p className="text-neutral-300 leading-relaxed">
              We use the information we collect for various purposes, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
              <li>Providing and maintaining our services</li>
              <li>Processing transactions and sending related information</li>
              <li>Sending administrative information, updates, and security alerts</li>
              <li>Responding to your comments, questions, and customer service requests</li>
              <li>Personalizing your experience and delivering targeted content</li>
              <li>Monitoring and analyzing usage patterns and trends</li>
              <li>Detecting, preventing, and addressing technical issues and fraud</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          {/* Cookies and Tracking */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Cookies and Tracking Technologies</h2>
            <p className="text-neutral-300 leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.
            </p>
            <p className="text-neutral-300 leading-relaxed">
              Types of cookies we use:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
              <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Marketing Cookies:</strong> Track your browsing habits to show relevant ads</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. How We Share Your Information</h2>
            <p className="text-neutral-300 leading-relaxed">
              We may share your information in the following situations:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
              <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, sale, or acquisition</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>With Your Consent:</strong> When you have given us explicit permission</li>
            </ul>
            <p className="text-neutral-300 leading-relaxed">
              We do not sell your personal information to third parties.
            </p>
          </section>

          {/* Data Security */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Data Security</h2>
            <p className="text-neutral-300 leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee its absolute security.
            </p>
          </section>

          {/* Your Rights (CCPA/GDPR) */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Your Privacy Rights</h2>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-neutral-200">7.1 California Residents (CCPA)</h3>
              <p className="text-neutral-300 leading-relaxed">
                If you are a California resident, you have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
                <li>Know what personal information we collect, use, and disclose</li>
                <li>Request deletion of your personal information</li>
                <li>Opt-out of the sale of your personal information (we do not sell your data)</li>
                <li>Non-discrimination for exercising your privacy rights</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-neutral-200">7.2 European Residents (GDPR)</h3>
              <p className="text-neutral-300 leading-relaxed">
                If you are in the European Economic Area (EEA), you have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
                <li>Access your personal data</li>
                <li>Rectify inaccurate personal data</li>
                <li>Request erasure of your personal data</li>
                <li>Restrict processing of your personal data</li>
                <li>Data portability</li>
                <li>Object to processing of your personal data</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </div>

            <p className="text-neutral-300 leading-relaxed">
              To exercise any of these rights, please contact us at privacy@gush.com
            </p>
          </section>

          {/* Data Retention */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Data Retention</h2>
            <p className="text-neutral-300 leading-relaxed">
              We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Children's Privacy</h2>
            <p className="text-neutral-300 leading-relaxed">
              Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>
          </section>

          {/* International Transfers */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. International Data Transfers</h2>
            <p className="text-neutral-300 leading-relaxed">
              Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. We will take all steps reasonably necessary to ensure that your data is treated securely and in accordance with this Privacy Policy.
            </p>
          </section>

          {/* Changes to Policy */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. Changes to This Privacy Policy</h2>
            <p className="text-neutral-300 leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">12. Contact Us</h2>
            <p className="text-neutral-300 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-2">
              <p className="text-neutral-300">
                <strong>Email:</strong> privacy@gush.com
              </p>
              <p className="text-neutral-300">
                <strong>Address:</strong> [Your Company Address]
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
