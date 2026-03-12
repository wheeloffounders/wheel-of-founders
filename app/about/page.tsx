'use client'

import { motion } from 'framer-motion'
import { Heart, Sparkles, Target, Users } from 'lucide-react'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <motion.div
      className="max-w-4xl mx-auto px-4 py-12"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="text-center mb-12">
        <motion.div
          className="flex justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <MrsDeerAvatar expression="welcoming" size="hero" />
        </motion.div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 dark:text-white mb-4">
          About Wheel of Founders
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 dark:text-gray-300 max-w-2xl mx-auto">
          A quiet coach in the background, helping founders turn scattered days into a clear, repeatable rhythm.
        </p>
      </div>

      {/* Mission */}
      <motion.section
        className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 border-l-4 border-[#EF725C]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-start gap-4 mb-6">
          <Heart className="w-8 h-8 text-[#EF725C] flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-3">Our Mission</h2>
            <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 leading-relaxed mb-4">
              Wheel of Founders isn&apos;t about doing more. It&apos;s about doing what actually matters, with a calmer mind.
            </p>
            <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 leading-relaxed">
              We believe founders deserve a tool that respects their time, honors their goals, and provides gentle guidance—not another app that adds to the noise.
            </p>
          </div>
        </div>
      </motion.section>

      {/* How It Works */}
      <motion.section
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-6 text-center">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <Target className="w-10 h-10 text-[#EF725C] mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-2">Morning Plan</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
              Set 2–3 priorities for the day. Mrs. Deer, your AI companion helps you focus on what moves the needle.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <Sparkles className="w-10 h-10 text-[#EF725C] mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-2">Evening Reflection</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
              Close the loop with a short reflection. What went well? What did you learn?
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <Users className="w-10 h-10 text-[#EF725C] mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-2">Gentle Coaching</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
              Mrs. Deer, your AI companion observes patterns and offers insights—never pushy, always supportive.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Values */}
      <motion.section
        className="bg-[#FFF0EC] dark:bg-amber-900/20 rounded-xl p-8 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-6">What We Stand For</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-1">✨ Simplicity Over Complexity</h3>
            <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 text-sm">
              No overwhelming dashboards. Just the essentials: plan, reflect, grow.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-1">🦌 Human-Centered Design</h3>
            <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 text-sm">
              Mrs. Deer, your AI companion feels like a real coach—warm, understanding, and genuinely helpful.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-1">🔒 Privacy First</h3>
            <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 text-sm">
              Your data stays yours. No selling, no sharing, no tracking across the web.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-1">💡 Built by Founders, for Founders</h3>
            <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 text-sm">
              Created by someone who knows the struggle. Every feature serves a real need.
            </p>
          </div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Link
          href="/auth/login"
          className="inline-block px-8 py-3 bg-[#EF725C] text-white font-semibold rounded-lg hover:bg-[#F28771] transition"
        >
          Start Your Journey →
        </Link>
      </motion.div>
    </motion.div>
  )
}
