export type PlanType = 'free' | 'pro' | 'team';

export type FeatureKey =
    | 'calendarSync'
    | 'cloudImport'
    | 'advancedSummaries'
    | 'teamSharing'
    | 'sharedWorkspaces'
    | 'teamAnalytics';

// Feature limits per plan
const featureLimits: Record<PlanType, Record<FeatureKey, boolean>> = {
    free: {
        calendarSync: false,
        cloudImport: false,
        advancedSummaries: false,
        teamSharing: false,
        sharedWorkspaces: false,
        teamAnalytics: false,
    },
    pro: {
        calendarSync: true,
        cloudImport: true,
        advancedSummaries: true,
        teamSharing: false,
        sharedWorkspaces: false,
        teamAnalytics: false,
    },
    team: {
        calendarSync: true,
        cloudImport: true,
        advancedSummaries: true,
        teamSharing: true,
        sharedWorkspaces: true,
        teamAnalytics: true,
    },
};

// Minute limits per plan (monthly)
const minuteLimits: Record<PlanType, number> = {
    free: 60,      // 1 hour
    pro: 300,      // 5 hours
    team: 1000,    // ~16 hours
};

/**
 * Check if user has access to a specific feature
 * @param userPlan - The user's plan type
 * @param feature - The feature to check access for
 * @returns True if the user has access to the feature
 */
export const canAccessFeature = (userPlan: PlanType, feature: FeatureKey): boolean => {
    // If feature gating is disabled, allow all features
    if (import.meta.env.VITE_DISABLE_FEATURE_GATING === 'true') {
        return true;
    }

    return featureLimits[userPlan]?.[feature] ?? false;
};

/**
 * Get the monthly minute limit for a plan
 * @param userPlan - The user's plan type
 * @returns The number of minutes allowed per month, or null for unlimited
 */
export const getMinuteLimit = (userPlan: PlanType): number => {
    return minuteLimits[userPlan] ?? 60;
};

/**
 * Get user-friendly display name for a plan
 * @param plan - The plan type
 * @returns Display name (capitalized)
 */
export const getPlanDisplayName = (plan: PlanType): string => {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
};

/**
 * Get pricing information for each plan
 */
export const planPricing = {
    free: {
        price: 0,
        minutesPerMonth: 60,
        features: ['Audio recording', 'Basic transcription'],
    },
    pro: {
        price: 99,
        minutesPerMonth: 300,
        features: [
            'Audio recording',
            'Advanced transcription',
            'Calendar sync (Google & Outlook)',
            'Cloud imports (Drive, Dropbox)',
            'Advanced summaries',
        ],
    },
    team: {
        price: 299,
        minutesPerMonth: 1000,
        features: [
            'Everything in Pro',
            'Team sharing',
            'Shared workspaces',
            'Team analytics',
            'Priority support',
        ],
    },
};

/**
 * Get upgrade recommendation message based on feature
 * @param feature - The feature user tried to access
 * @param currentPlan - Current user plan
 * @returns Human-readable upgrade message
 */
export const getUpgradeMessage = (feature: FeatureKey, currentPlan: PlanType): string => {
    const featureNames: Record<FeatureKey, string> = {
        calendarSync: 'Calendar synchronization',
        cloudImport: 'Cloud file imports',
        advancedSummaries: 'Advanced summaries',
        teamSharing: 'Team sharing',
        sharedWorkspaces: 'Shared workspaces',
        teamAnalytics: 'Team analytics',
    };

    const requiredPlan = currentPlan === 'free' ? 'pro' : 'team';
    return `${featureNames[feature]} is available on ${getPlanDisplayName(requiredPlan)} and higher plans.`;
};

