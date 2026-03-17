import type { Metadata } from "next"
import Link from "next/link"
import { Home } from "lucide-react"

export const metadata: Metadata = {
  title: "Privacy Policy — HomeMatch",
  description: "HomeMatch privacy policy — how we collect, use, and protect your data.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80">
          <Home className="size-5 text-primary" />
          <span className="text-lg font-semibold tracking-tight">HomeMatch</span>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: March 17, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="leading-relaxed">
              HomeMatch (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides an AI-powered property matching service
              consisting of a web application and a Chrome browser extension. This Privacy Policy explains what data we
              collect, how we use it, and your rights regarding that data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Data We Collect</h2>

            <h3 className="text-lg font-medium mt-4 mb-2">2.1 Account Information</h3>
            <p className="leading-relaxed">
              When you create an account, we collect your <strong>email address</strong> and an encrypted password.
              Authentication is handled by Supabase. We do not have access to your plaintext password.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">2.2 Search Profiles &amp; Preferences</h3>
            <p className="leading-relaxed">
              You create search profiles containing your property preferences — such as desired location, budget range,
              number of rooms, apartment size, and lifestyle amenities. This data is stored in our database and used
              solely to score property listings against your criteria.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">2.3 Property Listing Data</h3>
            <p className="leading-relaxed">
              When you use the Chrome extension to score listings on Flatfox.ch, the extension reads publicly available
              listing information (text descriptions, images, price, room count, address) from the page. This data is
              sent to our backend server for AI-powered scoring and is not permanently stored beyond the generated
              analysis result.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">2.4 Analysis Results</h3>
            <p className="leading-relaxed">
              Scored analyses (match score, category breakdowns, reasoning) are stored in our database so you can review
              them later on your analysis page. Each analysis is linked to your account and the profile used for scoring.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">2.5 Authentication Tokens</h3>
            <p className="leading-relaxed">
              The Chrome extension stores a session token (JWT) in Chrome&apos;s local storage to keep you logged in.
              This token is used to authenticate API requests and is not shared with any third party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Property scoring:</strong> Your preferences are compared against listing data using the Claude
                AI model (by Anthropic) to generate match scores and explanations.
              </li>
              <li>
                <strong>Account management:</strong> Your email is used for authentication and account recovery.
              </li>
              <li>
                <strong>Service improvement:</strong> We may use aggregated, anonymized usage patterns to improve the
                scoring quality. We do not use your personal data for advertising.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Third-Party Services</h2>
            <p className="leading-relaxed mb-3">We use the following third-party services to operate HomeMatch:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Supabase</strong> — Authentication, database hosting, and edge functions.
                See{" "}
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Supabase Privacy Policy
                </a>.
              </li>
              <li>
                <strong>Anthropic (Claude API)</strong> — AI model used to evaluate property listings. Listing data and
                your preferences are sent to Anthropic&apos;s API for scoring. Anthropic does not use API inputs to train
                their models.
                See{" "}
                <a
                  href="https://www.anthropic.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Anthropic Privacy Policy
                </a>.
              </li>
              <li>
                <strong>Vercel</strong> — Web application hosting.
                See{" "}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Vercel Privacy Policy
                </a>.
              </li>
              <li>
                <strong>Amazon Web Services (AWS)</strong> — Backend server hosting.
                See{" "}
                <a
                  href="https://aws.amazon.com/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  AWS Privacy Policy
                </a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data We Do NOT Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We do not track your browsing history or web activity outside of Flatfox.ch.</li>
              <li>We do not collect financial or payment information.</li>
              <li>We do not collect health data, location data, or personal communications.</li>
              <li>We do not use cookies for advertising or tracking purposes.</li>
              <li>We do not sell or transfer your data to third parties for advertising, data brokering, or any purpose unrelated to the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Storage &amp; Security</h2>
            <p className="leading-relaxed">
              Your data is stored in a Supabase-hosted PostgreSQL database with row-level security (RLS) enabled,
              meaning each user can only access their own data. All connections use HTTPS/TLS encryption in transit.
              Authentication tokens are securely managed by Supabase Auth.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
            <p className="leading-relaxed">
              Your account data, preferences, and analysis results are retained for as long as your account is active.
              AI chat conversations used for profile creation are ephemeral and are not persisted beyond the browser
              session. You can delete your account and all associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
            <p className="leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and all associated data.</li>
              <li>Export your data in a portable format.</li>
            </ul>
            <p className="leading-relaxed mt-3">
              To exercise any of these rights, contact us at the email address below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Chrome Extension Permissions</h2>
            <p className="leading-relaxed">The HomeMatch Chrome extension requests the following permissions:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Storage:</strong> To persist your authentication session across browser restarts.
              </li>
              <li>
                <strong>Host access to flatfox.ch:</strong> To read property listing content and inject score badges
                into the page.
              </li>
              <li>
                <strong>Host access to supabase.co:</strong> To authenticate your account and communicate with the
                scoring API.
              </li>
            </ul>
            <p className="leading-relaxed mt-3">
              The extension does not access any other websites, does not run in the background, and does not collect
              data when you are not actively using it on Flatfox.ch.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be reflected on this page with an
              updated &quot;Last updated&quot; date. Continued use of the service after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
            <p className="leading-relaxed">
              If you have questions about this Privacy Policy or want to exercise your data rights, contact us at:{" "}
              <a href="mailto:maxim.gusev11@gmail.com" className="text-primary underline">
                maxim.gusev11@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} HomeMatch. All rights reserved.</p>
        </div>
      </main>
    </div>
  )
}
