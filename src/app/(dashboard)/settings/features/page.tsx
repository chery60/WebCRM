'use client';

import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  useFeatureSettingsStore,
  FEATURE_INFO,
  type FeatureKey
} from '@/lib/stores/feature-settings-store';
import {
  StickyNote,
  GitBranch,
  CheckSquare,
  Calendar,
  BarChart3,
  Users,
  RotateCcw
} from 'lucide-react';

const FeatureIcon = ({ featureKey }: { featureKey: FeatureKey }) => {
  const iconClass = "h-5 w-5";
  switch (featureKey) {
    case 'notes':
      return <StickyNote className={iconClass} />;
    case 'pipelines':
      return <GitBranch className={iconClass} />;
    case 'tasks':
      return <CheckSquare className={iconClass} />;
    case 'calendar':
      return <Calendar className={iconClass} />;
    case 'analytics':
      return <BarChart3 className={iconClass} />;
    case 'employees':
      return <Users className={iconClass} />;
    default:
      return null;
  }
};

function FeatureToggleCard({ featureKey }: { featureKey: FeatureKey }) {
  const { features, setFeature } = useFeatureSettingsStore();
  const featureInfo = FEATURE_INFO.find((f) => f.key === featureKey);

  if (!featureInfo) return null;

  const isEnabled = features[featureKey];

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <FeatureIcon featureKey={featureKey} />
        </div>
        <div>
          <h3 className="text-sm font-medium">{featureInfo.title}</h3>
          <p className="text-sm text-muted-foreground">{featureInfo.description}</p>
        </div>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={(checked) => setFeature(featureKey, checked)}
      />
    </div>
  );
}

export default function FeaturesSettingsPage() {
  const { resetToDefaults } = useFeatureSettingsStore();

  const mainFeatures = FEATURE_INFO.filter((f) => f.section === 'main');
  const databaseFeatures = FEATURE_INFO.filter((f) => f.section === 'database');

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-medium mb-1">Features</h1>
        <p className="text-sm text-muted-foreground">
          Toggle features on or off to customize your navigation. Disabled features will be hidden from the sidebar.
        </p>
      </div>

      {/* Main Features */}
      <div className="mb-8">
        <h2 className="text-base font-medium mb-2">Main Features</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Core modules for your workspace
        </p>
        <div className="border rounded-lg divide-y">
          {mainFeatures.map((feature) => (
            <div key={feature.key} className="px-4">
              <FeatureToggleCard featureKey={feature.key} />
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Database Features */}
      <div className="mb-8">
        <h2 className="text-base font-medium mb-2">Database Features</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Data management and reporting modules
        </p>
        <div className="border rounded-lg divide-y">
          {databaseFeatures.map((feature) => (
            <div key={feature.key} className="px-4">
              <FeatureToggleCard featureKey={feature.key} />
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Reset */}
      <div>
        <h2 className="text-base font-medium mb-2">Reset Features</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Restore all features to their default enabled state
        </p>
        <Button variant="outline" onClick={resetToDefaults}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
