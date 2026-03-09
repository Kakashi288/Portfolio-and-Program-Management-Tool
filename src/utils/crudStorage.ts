export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    console.error('Failed to save to localStorage');
  }
}

export const STORAGE_KEYS = {
  PORTFOLIO_PROJECTS: 'ppmt_portfolio_projects',
  BENEFITS: 'ppmt_benefits',
  BUSINESS_CASES: 'ppmt_business_cases',
  RAID_ITEMS: 'ppmt_raid_items',
  CHANGE_REQUESTS: 'ppmt_change_requests',
  DECISIONS: 'ppmt_decisions',
  TEAM_MEMBERS: 'ppmt_team_members',
  PIPELINE_PROJECTS: 'ppmt_pipeline_projects',
  FINANCIALS: 'ppmt_financials',
};
