export interface FeatureAccess {
  // History viewing limits (data stored forever for all)
  canViewFullHistory: boolean
  viewableHistoryDays: number // Free: 2 days, others: Infinity
  
  // REMOVED: Smart Constraints (feature deprecated - all AI from Mrs. Deer)
  smartConstraints: boolean      // Always false - feature removed
  communityWeeklyInsights: boolean // Weekly community trends (Sunday 6 PM)
  
  // PRO COACH: Personal Coach (Individual real-time analysis)
  dailyMorningPrompt: boolean    // Morning Dashboard Prompt (Gentle Architect)
  dailyPostMorningPrompt: boolean // Post-Morning Plan Analysis
  dailyPostEveningPrompt: boolean // Post-Evening Reflection Insight
  personalWeeklyInsight: boolean  // Personalized weekly (Sunday 6 PM)
  personalMonthlyInsight: boolean // Personalized monthly (1st of month)
  
  // LIVE AI CHAT IS DISABLED FOR ALL TIERS
  liveAICoach: boolean           // Always false - no live chat
  
  // Other features
  emailDigest: boolean           // Weekly email summaries
  exportFeatures: boolean        // Export/Share functionality
  videoTemplates: boolean        // Video template library (Pro+)
  yearlyReport: boolean          // Yearly insight report
  fiveYearTrends: boolean        // 5-year trends (Pro+)
}

export interface UserProfile {
  tier?: string
  pro_features_enabled?: boolean
}

export const getFeatureAccess = (user: UserProfile | null | undefined): FeatureAccess => {
  // During beta, ALL users get PRO+ access
  const isBeta = !user || user.tier === 'beta' || user.pro_features_enabled !== false
  const isFree = user?.tier === 'free' && !isBeta
  const isPro = user?.tier === 'pro' || isBeta
  const isProPlus = user?.tier === 'pro_plus' || isBeta
  
  return {
    // History viewing limits
    canViewFullHistory: isBeta || isPro || isProPlus,
    viewableHistoryDays: isFree ? 2 : Infinity, // Free: last 2 days only
    
    // REMOVED: Smart Constraints - feature deprecated
    smartConstraints: false,
    communityWeeklyInsights: isBeta || isPro || isProPlus, // Weekly community trends
    
    // PRO COACH: Personal Coach (now part of Pro)
    dailyMorningPrompt: isBeta || isPro || isProPlus, // Gentle Architect morning prompt
    dailyPostMorningPrompt: isBeta || isPro || isProPlus, // Post-morning plan analysis
    dailyPostEveningPrompt: isBeta || isPro || isProPlus, // Post-evening reflection
    personalWeeklyInsight: isBeta || isPro || isProPlus, // Personalized weekly
    personalMonthlyInsight: isBeta || isPro || isProPlus, // Personalized monthly
    
    // LIVE AI CHAT DISABLED
    liveAICoach: false, // No live chat for any tier
    
    // Other features
    emailDigest: isBeta || isPro || isProPlus,
    exportFeatures: isBeta || isPro || isProPlus,
    videoTemplates: isBeta || isPro || isProPlus,
    yearlyReport: isBeta || isPro || isProPlus,
    fiveYearTrends: isBeta || isPro || isProPlus,
  }
}

// Helper to check specific features
export const canAccess = (user: UserProfile | null | undefined, feature: keyof FeatureAccess): boolean => {
  return getFeatureAccess(user)[feature]
}

// Helper to get user's tier display name
export const getTierDisplayName = (tier?: string): string => {
  switch (tier) {
    case 'beta':
      return 'Beta'
    case 'free':
      return 'Free'
    case 'pro':
      return 'Pro'
    case 'pro_plus':
      return 'Pro+'
    default:
      return 'Beta'
  }
}
