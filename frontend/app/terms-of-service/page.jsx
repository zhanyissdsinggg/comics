/* eslint-disable react/no-unescaped-entities */
import SiteHeader from "../../components/layout/SiteHeader";

export const metadata = {
  title: "Terms of Service - Gush",
  description: "Terms and conditions for using Gush services.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 pb-12 pt-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Terms of Service</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Last Updated: February 10, 2026
            </p>
          </div>

          {/* Introduction */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Agreement to Terms</h2>
            <p className="text-neutral-300 leading-relaxed">
              These Terms of Service ("Terms") govern your access to and use of Gush's website, mobile applications, and services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Services.
            </p>
            <p className="text-neutral-300 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page. Your continued use of the Services after such modifications constitutes your acceptance of the updated Terms.
            </p>
          </section>

          {/* Eligibility */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Eligibility</h2>
            <p className="text-neutral-300 leading-relaxed">
              You must be at least 13 years old to use our Services. If you are under 18, you must have permission from a parent or legal guardian. By using our Services, you represent and warrant that you meet these eligibility requirements.
            </p>
            <p className="text-neutral-300 leading-relaxed">
              Some content on our platform may be restricted to users 18 years or older. You agree to comply with all age restrictions and content ratings.
            </p>
          </section>

          {/* Account Registration */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Account Registration and Security</h2>
            <p className="text-neutral-300 leading-relaxed">
              To access certain features of our Services, you may need to create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password secure and confidential</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>
            <p className="text-neutral-300 leading-relaxed">
              We reserve the right to suspend or terminate your account if you violate these Terms or engage in fraudulent or illegal activities.
            </p>
          </section>

          {/* Content and Licenses */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Content and Intellectual Property</h2>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-neutral-200">4.1 Our Content</h3>
              <p className="text-neutral-300 leading-relaxed">
                All content on our Services, including but not limited to text, graphics, logos, images, comics, novels, audio, video, and software, is the property of Gush or its content suppliers and is protected by United States and international copyright, trademark, and other intellectual property laws.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-neutral-200">4.2 License to Use</h3>
              <p className="text-neutral-300 leading-relaxed">
                Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use our Services for your personal, non-commercial use. You may not:
              </p>
              <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
                <li>Copy, modify, distribute, sell, or lease any part of our Services</li>
                <li>Reverse engineer or attempt to extract the source code of our Services</li>
                <li>Remove, alter, or obscure any copyright, trademark, or other proprietary notices</li>
                <li>Use our Services for any illegal or unauthorized purpose</li>
                <li>Share your account credentials with others</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-neutral-200">4.3 User-Generated Content</h3>
              <p className="text-neutral-300 leading-relaxed">
                If you submit comments, reviews, or other content to our Services, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display such content in connection with our Services.
              </p>
            </div>
          </section>

          {/* Purchases and Payments */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Purchases and Payments</h2>
            <p className="text-neutral-300 leading-relaxed">
              Our Services may offer virtual currency, subscriptions, and other digital content for purchase. By making a purchase, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
              <li>Provide accurate and complete payment information</li>
              <li>Pay all applicable fees and taxes</li>
              <li>Authorize us to charge your payment method</li>
            </ul>
            <p className="text-neutral-300 leading-relaxed">
              All sales are final unless otherwise stated. Virtual currency and digital content have no monetary value and cannot be redeemed for cash. Subscriptions will automatically renew unless you cancel before the renewal date.
            </p>
          </section>

          {/* Refund Policy */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Refund Policy</h2>
            <p className="text-neutral-300 leading-relaxed">
              Due to the digital nature of our content, all purchases are generally non-refundable. However, we may provide refunds at our sole discretion in cases of:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
              <li>Technical errors that prevent access to purchased content</li>
              <li>Duplicate charges</li>
              <li>Unauthorized transactions (subject to verification)</li>
            </ul>
            <p className="text-neutral-300 leading-relaxed">
              To request a refund, please contact our customer support within 14 days of purchase.
            </p>
          </section>

          {/* Prohibited Conduct */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Prohibited Conduct</h2>
            <p className="text-neutral-300 leading-relaxed">
              You agree not to engage in any of the following prohibited activities:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
              <li>Violating any applicable laws or regulations</li>
              <li>Infringing on the intellectual property rights of others</li>
              <li>Transmitting viruses, malware, or other harmful code</li>
              <li>Attempting to gain unauthorized access to our systems</li>
              <li>Harassing, threatening, or abusing other users</li>
              <li>Impersonating any person or entity</li>
              <li>Collecting or harvesting user data without permission</li>
              <li>Using automated systems (bots, scrapers) to access our Services</li>
              <li>Circumventing any security features or access controls</li>
            </ul>
          </section>

          {/* Termination */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Termination</h2>
            <p className="text-neutral-300 leading-relaxed">
              We may suspend or terminate your access to our Services at any time, with or without notice, for any reason, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
              <li>Violation of these Terms</li>
              <li>Fraudulent or illegal activity</li>
              <li>Prolonged inactivity</li>
              <li>At your request</li>
            </ul>
            <p className="text-neutral-300 leading-relaxed">
              Upon termination, your right to use our Services will immediately cease. We are not liable for any loss or damage resulting from termination of your account.
            </p>
          </section>

          {/* Disclaimers */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Disclaimers</h2>
            <p className="text-neutral-300 leading-relaxed">
              OUR SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
              <li>Our Services will be uninterrupted, secure, or error-free</li>
              <li>The content will be accurate, complete, or current</li>
              <li>Any defects will be corrected</li>
              <li>Our Services are free of viruses or other harmful components</li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Limitation of Liability</h2>
            <p className="text-neutral-300 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TAPPYTOON SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
            <p className="text-neutral-300 leading-relaxed">
              OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR OUR SERVICES SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.
            </p>
          </section>

          {/* Indemnification */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. Indemnification</h2>
            <p className="text-neutral-300 leading-relaxed">
              You agree to indemnify, defend, and hold harmless Gush and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses, including reasonable attorney's fees, arising out of or in any way connected with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-4">
              <li>Your access to or use of our Services</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Any content you submit to our Services</li>
            </ul>
          </section>

          {/* Dispute Resolution */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">12. Dispute Resolution and Arbitration</h2>
            <p className="text-neutral-300 leading-relaxed">
              Any dispute arising out of or relating to these Terms or our Services shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall take place in [Your State/Country], and judgment on the award may be entered in any court having jurisdiction.
            </p>
            <p className="text-neutral-300 leading-relaxed">
              YOU AGREE TO WAIVE YOUR RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN A CLASS ACTION LAWSUIT.
            </p>
          </section>

          {/* Governing Law */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">13. Governing Law</h2>
            <p className="text-neutral-300 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of [Your State], United States, without regard to its conflict of law provisions.
            </p>
          </section>

          {/* Severability */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">14. Severability</h2>
            <p className="text-neutral-300 leading-relaxed">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue to be valid and enforceable to the fullest extent permitted by law.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">15. Contact Us</h2>
            <p className="text-neutral-300 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-2">
              <p className="text-neutral-300">
                <strong>Email:</strong> legal@gush.com
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
