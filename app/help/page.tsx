import {
  Book,
  Sun,
  Moon,
  AlertCircle,
  BarChart2,
  Users,
  Target,
  MessageSquare,
  Zap,
  Award,
  Lightbulb,
  Heart,
  Check,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { colors } from '@/lib/design-tokens'
import { HelpTourCard } from '@/components/HelpTourCard'

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Help & Getting Started</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Everything you need to know about using Wheel of Founders.
      </p>

      <HelpTourCard />

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link
          href="#getting-started"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#ef725c] transition"
        >
          <Book className="w-8 h-8 mb-3" style={{ color: colors.coral.DEFAULT }} />
          <h2 className="font-bold text-lg mb-1">Getting Started Guide</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Learn the basics in 5 minutes</p>
        </Link>

        <Link
          href="#morning"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#ef725c] transition"
        >
          <Sun className="w-8 h-8 mb-3" style={{ color: colors.coral.DEFAULT }} />
          <h2 className="font-bold text-lg mb-1">Morning Routine</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Plan your day effectively</p>
        </Link>

        <Link
          href="#evening"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#ef725c] transition"
        >
          <Moon className="w-8 h-8 mb-3" style={{ color: colors.coral.DEFAULT }} />
          <h2 className="font-bold text-lg mb-1">Evening Reflection</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Review and learn from your day</p>
        </Link>

        <Link
          href="#insights"
          className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#ef725c] transition"
        >
          <BarChart2 className="w-8 h-8 mb-3" style={{ color: colors.coral.DEFAULT }} />
          <h2 className="font-bold text-lg mb-1">Insights</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Weekly, monthly, and quarterly patterns</p>
        </Link>
      </div>

      <div className="space-y-8">
        <section
          id="getting-started"
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 scroll-mt-20"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Book className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
            Getting Started Guide
          </h2>

          <div className="prose dark:prose-invert max-w-none space-y-4">
            <h3 className="text-lg font-semibold">1. Set Your Goal</h3>
            <p>
              Your journey starts with a goal. What are you working toward? This helps Mrs. Deer personalize your
              insights.
            </p>

            <h3 className="text-lg font-semibold">2. Morning Plan</h3>
            <p>
              Each morning, list your top 3 tasks for the day. Mark one as your &quot;needle mover&quot;—the one thing
              that will make the biggest difference.
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Task:</strong> What needs to get done
              </li>
              <li>
                <strong>Why it matters:</strong> Connect each task to your bigger goal
              </li>
              <li>
                <strong>Action plan:</strong> Choose how you&apos;ll approach it (My Zone, Quick Win, Systemize, Delegate)
              </li>
            </ul>

            <h3 className="text-lg font-semibold">3. Decision Log</h3>
            <p>
              Founders make decisions daily. Log the important ones and why you made them. This becomes your
              decision-making history.
            </p>

            <h3 className="text-lg font-semibold">4. Evening Reflection</h3>
            <p>At the end of your day, reflect on:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Wins:</strong> What went well?
              </li>
              <li>
                <strong>Lessons:</strong> What would you do differently?
              </li>
              <li>
                <strong>Journal:</strong> Free-form thoughts about your day
              </li>
              <li>
                <strong>Mood & Energy:</strong> Track how you&apos;re feeling
              </li>
            </ul>

            <h3 className="text-lg font-semibold">5. Mrs. Deer Insights</h3>
            <p>
              After each entry, Mrs. Deer generates personalized insights based on your patterns. She helps you see
              what you might have missed.
            </p>
          </div>
        </section>

        <section
          id="morning"
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 scroll-mt-20"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Sun className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
            Morning Routine Deep Dive
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.coral.DEFAULT }} />
              <div>
                <span className="font-medium">3-task Power List</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Focus on what matters most—not everything.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">⭐</span>
              <div>
                <span className="font-medium">Needle Movers</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The one thing that, if moved today, would change the game. Mark it with ⭐.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.navy.DEFAULT }} />
              <div>
                <span className="font-medium">Decision Log</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Strategic (big picture) vs tactical (today&apos;s call). Capture your key decision.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="evening"
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 scroll-mt-20"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Moon className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
            Evening Reflection Deep Dive
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.navy.DEFAULT }} />
              <div>
                <span className="font-medium">Journal</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  What mattered most? What would you carry forward?
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.emerald.DEFAULT }} />
              <div>
                <span className="font-medium">Wins & Lessons</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Celebrate what worked. Note what you&apos;d do differently.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.coral.DEFAULT }} />
              <div>
                <span className="font-medium">Mood & Energy</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">Quick check-in—no judgment, just awareness.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.emerald.DEFAULT }} />
              <div>
                <span className="font-medium">Morning tasks sync</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mark your Power List items complete. See your progress.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="insights"
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 scroll-mt-20"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
            Understanding Your Insights
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Sun className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.amber.DEFAULT }} />
              <div>
                <span className="font-medium">Post-morning insight</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  After you save your plan, Mrs. Deer reflects on your focus and offers one gentle nudge.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Moon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.navy.DEFAULT }} />
              <div>
                <span className="font-medium">Post-evening insight</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  After your reflection, Mrs. Deer notices patterns and offers perspective.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.coral.DEFAULT }} />
              <div>
                <span className="font-medium">Weekly, monthly, quarterly</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pattern recognition across your week—what&apos;s working, what&apos;s shifting. The more you use
                  the app, the smarter Mrs. Deer gets.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="emergency"
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 scroll-mt-20"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
            Emergency Mode
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            When fires happen, use Emergency mode to log them quickly. Mrs. Deer will help you reflect on how you
            handled it and what you learned.
          </p>
        </section>

        <section
          id="duo"
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 scroll-mt-20"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
            Duo Plan
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Build your founder journey with a co-founder or accountability partner. Share insights and stay aligned
            on your goals together.
          </p>
        </section>

        <section
          id="faq"
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 scroll-mt-20"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
            Frequently Asked Questions
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="font-medium">How often should I use the app?</dt>
              <dd className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Morning and evening each day builds the best pattern. Even a quick 2-minute check-in helps.
              </dd>
            </div>
            <div>
              <dt className="font-medium">What if I miss a day?</dt>
              <dd className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                No judgment. Just pick up where you left off. Mrs. Deer is here whenever you return.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Is my data private?</dt>
              <dd className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Yes. Your reflections and plans are yours. We use them only to personalize your insights.
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}
