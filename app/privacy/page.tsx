import { Shield, Mail, Database, Cookie } from 'lucide-react'
import Link from 'next/link'
import { colors } from '@/lib/design-tokens'

export const metadata = {
  title: 'Privacy Policy | Wheel of Founders',
  description: 'How Wheel of Founders collects, uses, and protects your data. Your data belongs to you.',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-10 h-10" style={{ color: colors.coral.DEFAULT }} />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Last updated: March 2026</p>
        </div>
      </div>

      <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
        At Wheel of Founders, we believe your data is yours. This policy explains what we collect, why we collect it,
        and how you stay in control. We&apos;ve written it in plain language—no legalese required.
      </p>

      <div className="space-y-8">
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">What Data We Collect</h2>
          <div className="prose dark:prose-invert max-w-none space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              When you use Wheel of Founders, we collect only what we need to give you a personalized experience:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account info from Google:</strong> If you sign in with Google, we receive your email address
                and name. We use this to create your account and personalize your experience.
              </li>
              <li>
                <strong>Profile information:</strong> Your goals, struggles, and preferences—the things you tell Mrs.
                Deer so she can tailor insights to you.
              </li>
              <li>
                <strong>Morning and evening entries:</strong> Your tasks, decisions, wins, lessons, journal notes,
                mood, and energy. This is the heart of the app—it&apos;s how we generate meaningful insights.
              </li>
              <li>
                <strong>Usage data:</strong> How you use the app (e.g., which features you use) to improve the
                product and fix issues.
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">How We Use Your Data</h2>
          <div className="prose dark:prose-invert max-w-none space-y-3 text-gray-700 dark:text-gray-300">
            <p>We use your data to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Generate insights:</strong> Mrs. Deer uses your morning plans and evening reflections to
                create personalized coaching—weekly, monthly, and quarterly reflections that help you see patterns
                and grow.
              </li>
              <li>
                <strong>Improve the app:</strong> We analyze usage (anonymized where possible) to fix bugs, add
                features, and make the experience better.
              </li>
              <li>
                <strong>Personalize your experience:</strong> Your goals and preferences shape the prompts,
                suggestions, and tone of the insights you receive.
              </li>
            </ul>
            <p className="mt-4">
              We do not sell your data. Ever. Your reflections and plans are yours—we use them only to serve you
              better.
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Data Storage & Security</h2>
          </div>
          <div className="prose dark:prose-invert max-w-none space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Your data is stored in <strong>Supabase</strong>, a secure cloud database. Data is encrypted in
              transit (HTTPS) and at rest. We use row-level security so each user can access only their own data.
            </p>
            <p>
              Our infrastructure runs on <strong>Vercel</strong>. We follow industry best practices to keep your
              information safe.
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Third-Party Services</h2>
          <div className="prose dark:prose-invert max-w-none space-y-3 text-gray-700 dark:text-gray-300">
            <p>We work with a few trusted partners to run the app:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Google:</strong> For sign-in (OAuth). When you use &quot;Sign in with Google,&quot; Google
                shares your email and name with us. See{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#ef725c] hover:underline"
                >
                  Google&apos;s Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>Sentry:</strong> For error tracking. When something goes wrong, we send error reports
                (including limited context) to help us fix bugs. No personal content is included.
              </li>
              <li>
                <strong>PostHog:</strong> For product analytics. We use it to understand how features are used so we
                can improve the app. You can opt out of analytics in settings.
              </li>
              <li>
                <strong>Vercel:</strong> For hosting. Your requests pass through Vercel&apos;s infrastructure.
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Your Rights</h2>
          <div className="prose dark:prose-invert max-w-none space-y-3 text-gray-700 dark:text-gray-300">
            <p>You own your data. You can:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Access it:</strong> View all your data in the app. Export it anytime from Settings →
                Data Export (JSON, CSV, or PDF).
              </li>
              <li>
                <strong>Delete it:</strong> Request account deletion. We can delete your account and associated
                data. Contact us to do this.
              </li>
              <li>
                <strong>Correct it:</strong> Update your profile, goals, and preferences anytime in the app.
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cookie className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cookies</h2>
          </div>
          <div className="prose dark:prose-invert max-w-none space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              We use <strong>essential cookies</strong> to keep you logged in and to remember your preferences.
              These are required for the app to work. We do not use cookies for advertising or tracking across
              other sites.
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Contact Us</h2>
          </div>
          <div className="prose dark:prose-invert max-w-none space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Questions about your data or this policy? We&apos;re happy to help.
            </p>
            <p>
              <strong>Wheel of Founders</strong>
              <br />
              Email:{' '}
              <a
                href="mailto:wttmotivation@gmail.com"
                className="text-[#ef725c] hover:underline"
              >
                wttmotivation@gmail.com
              </a>
            </p>
          </div>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
        <Link
          href="/help"
          className="text-[#ef725c] hover:underline font-medium"
        >
          ← Back to Help
        </Link>
      </div>
    </div>
  )
}
