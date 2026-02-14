export type PlanType = 'free' | 'pro' | 'team';

export type FeatureKey =
    | 'calendarSync'
    | 'cloudImport'
    | 'advancedSummaries'
    | 'teamSharing'
    | 'sharedWorkspaces'
    | 'teamAnalytics';

// All features are free — no gating
export const canAccessFeature = (_userPlan: PlanType, _feature: FeatureKey): boolean => {
    return true;
};

// Unlimited minutes for everyone
export const getMinuteLimit = (_userPlan: PlanType): number | null => {
    return null;
};

export const getPlanDisplayName = (plan: PlanType): string => {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
};
