import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FeatureSettings {
  notes: boolean;
  pipelines: boolean;
  tasks: boolean;
  calendar: boolean;
  analytics: boolean;
  employees: boolean;
}

export type FeatureKey = keyof FeatureSettings;

export interface FeatureInfo {
  key: FeatureKey;
  title: string;
  description: string;
  section: 'main' | 'database';
}

export const FEATURE_INFO: FeatureInfo[] = [
  {
    key: 'notes',
    title: 'Notes',
    description: 'Create and organize notes with projects',
    section: 'main',
  },
  {
    key: 'pipelines',
    title: 'Pipelines',
    description: 'Manage product roadmaps and PRDs',
    section: 'main',
  },
  {
    key: 'tasks',
    title: 'Tasks',
    description: 'Track and manage tasks',
    section: 'main',
  },
  {
    key: 'calendar',
    title: 'Calendar',
    description: 'View and schedule events',
    section: 'main',
  },
  {
    key: 'analytics',
    title: 'Analytics',
    description: 'View reports and analytics',
    section: 'database',
  },
  {
    key: 'employees',
    title: 'Employees',
    description: 'Manage employee directory',
    section: 'database',
  },
];

interface FeatureSettingsState {
  features: FeatureSettings;
  setFeature: (feature: FeatureKey, enabled: boolean) => void;
  toggleFeature: (feature: FeatureKey) => void;
  resetToDefaults: () => void;
  isFeatureEnabled: (feature: FeatureKey) => boolean;
}

const defaultFeatures: FeatureSettings = {
  notes: true,
  pipelines: true,
  tasks: true,
  calendar: true,
  analytics: true,
  employees: true,
};

export const useFeatureSettingsStore = create<FeatureSettingsState>()(
  persist(
    (set, get) => ({
      features: { ...defaultFeatures },

      setFeature: (feature, enabled) =>
        set((state) => ({
          features: { ...state.features, [feature]: enabled },
        })),

      toggleFeature: (feature) =>
        set((state) => ({
          features: { ...state.features, [feature]: !state.features[feature] },
        })),

      resetToDefaults: () =>
        set({ features: { ...defaultFeatures } }),

      isFeatureEnabled: (feature) => get().features[feature],
    }),
    {
      name: 'venture-crm-features',
    }
  )
);
