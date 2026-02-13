export type PlanType = 'free' | 'pro' | 'team';

export type FeatureKey =
    | 'calendarSync'
    | 'cloudImport'
    | 'advancedSummaries'
    | 'teamSharing'
    | 'sharedWorkspaces'
    | 'teamAnalytics';

const featureAccess: Record<FeatureKey, PlanType[]> = {
    calendarSync: ['pro', 'team'],
    cloudImport: ['pro', 'team'],
    advancedSummaries: ['pro', 'team'],
    teamSharing: ['team'],
    sharedWorkspaces: ['team'],
    teamAnalytics: ['team'],
};

export const canAccessFeature = (userPlan: PlanType, feature: FeatureKey): boolean => {
    return featureAccess[feature]?.includes(userPlan) ?? true;
};

export const getMinuteLimit = (userPlan: PlanType): number | null => {
    switch (userPlan) {
        case 'free':
            return 60; // 60 minutes total (lifetime)
        case 'pro':
            return 6000; // 6000 minutes per month
        case 'team':
            return null; // Unlimited
        default:
            return 60;
    }
};

export const getPlanDisplayName = (plan: PlanType): string => {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
};
