'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
    useAISettingsStore, 
    AI_MODELS, 
    getProviderDisplayName,
    maskApiKey,
    type AIProviderType 
} from '@/lib/stores/ai-settings-store';
import { 
    Eye, 
    EyeOff, 
    Check, 
    X, 
    Loader2, 
    Sparkles,
    Bot,
    Brain,
    Wand2
} from 'lucide-react';

// Provider icons mapping
const ProviderIcon = ({ provider }: { provider: AIProviderType }) => {
    switch (provider) {
        case 'openai':
            return <Bot className="h-5 w-5" />;
        case 'anthropic':
            return <Brain className="h-5 w-5" />;
        case 'gemini':
            return <Wand2 className="h-5 w-5" />;
    }
};

// AI Provider Configuration Card Component
function AIProviderCard({ provider }: { provider: AIProviderType }) {
    const [showApiKey, setShowApiKey] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [localApiKey, setLocalApiKey] = useState('');
    
    const { 
        providers, 
        setApiKey, 
        setDefaultModel, 
        setEnabled,
        setTestStatus,
        activeProvider,
        setActiveProvider 
    } = useAISettingsStore();
    
    const config = providers[provider];
    const models = AI_MODELS[provider];
    const displayName = getProviderDisplayName(provider);
    const isActive = activeProvider === provider;
    const hasApiKey = config.apiKey.length > 0;

    // Initialize local API key from store
    useState(() => {
        if (config.apiKey) {
            setLocalApiKey(config.apiKey);
        }
    });

    const handleApiKeyChange = (value: string) => {
        setLocalApiKey(value);
    };

    const handleApiKeyBlur = () => {
        if (localApiKey !== config.apiKey) {
            setApiKey(provider, localApiKey);
        }
    };

    const handleTestConnection = useCallback(async () => {
        if (!config.apiKey) return;
        
        setIsTesting(true);
        try {
            // Test the API connection based on provider
            let isValid = false;
            
            if (provider === 'openai') {
                const response = await fetch('https://api.openai.com/v1/models', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${config.apiKey}`,
                    },
                });
                isValid = response.ok;
            } else if (provider === 'anthropic') {
                // Anthropic doesn't have a simple models endpoint, so we do a minimal completion
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': config.apiKey,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true',
                    },
                    body: JSON.stringify({
                        model: config.defaultModel || 'claude-sonnet-4-20250514',
                        max_tokens: 1,
                        messages: [{ role: 'user', content: 'Hi' }],
                    }),
                });
                isValid = response.ok;
            } else if (provider === 'gemini') {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1/models?key=${config.apiKey}`,
                    { method: 'GET' }
                );
                isValid = response.ok;
            }
            
            setTestStatus(provider, isValid ? 'success' : 'failed');
            
            // Auto-enable if test succeeds and not already enabled
            if (isValid && !config.isEnabled) {
                setEnabled(provider, true);
            }
        } catch {
            setTestStatus(provider, 'failed');
        } finally {
            setIsTesting(false);
        }
    }, [config.apiKey, config.defaultModel, config.isEnabled, provider, setTestStatus, setEnabled]);

    return (
        <div className={`border rounded-lg p-4 ${isActive ? 'border-primary bg-primary/5' : ''}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <ProviderIcon provider={provider} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium">{displayName}</h3>
                            {config.testStatus === 'success' && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                    <Check className="h-3 w-3 mr-1" />
                                    Connected
                                </Badge>
                            )}
                            {config.testStatus === 'failed' && (
                                <Badge variant="outline" className="text-red-600 border-red-600">
                                    <X className="h-3 w-3 mr-1" />
                                    Failed
                                </Badge>
                            )}
                            {isActive && (
                                <Badge className="bg-primary">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Active
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {provider === 'openai' && 'GPT-4o, GPT-4 Turbo, GPT-3.5'}
                            {provider === 'anthropic' && 'Claude Sonnet 4, Claude 3.5, Claude 3 Opus'}
                            {provider === 'gemini' && 'Gemini 1.5 Pro, Gemini 1.5 Flash'}
                        </p>
                    </div>
                </div>
                <Switch
                    checked={config.isEnabled}
                    onCheckedChange={(checked) => setEnabled(provider, checked)}
                    disabled={!hasApiKey}
                />
            </div>

            {/* API Key Input */}
            <div className="space-y-3">
                <div>
                    <Label className="text-sm">API Key</Label>
                    <div className="flex gap-2 mt-1">
                        <div className="relative flex-1">
                            <Input
                                type={showApiKey ? 'text' : 'password'}
                                placeholder={`Enter your ${displayName} API key`}
                                value={showApiKey ? localApiKey : (localApiKey ? maskApiKey(localApiKey) : '')}
                                onChange={(e) => handleApiKeyChange(e.target.value)}
                                onBlur={handleApiKeyBlur}
                                onFocus={() => {
                                    if (!showApiKey && config.apiKey) {
                                        setLocalApiKey(config.apiKey);
                                    }
                                }}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTestConnection}
                            disabled={!hasApiKey || isTesting}
                            className="shrink-0"
                        >
                            {isTesting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                'Test Connection'
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {provider === 'openai' && 'Get your API key from platform.openai.com'}
                        {provider === 'anthropic' && 'Get your API key from console.anthropic.com'}
                        {provider === 'gemini' && 'Get your API key from aistudio.google.com'}
                    </p>
                </div>

                {/* Model Selection */}
                <div>
                    <Label className="text-sm">Default Model</Label>
                    <Select 
                        value={config.defaultModel} 
                        onValueChange={(value) => setDefaultModel(provider, value)}
                        disabled={!hasApiKey}
                    >
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                            {models.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                    <div className="flex flex-col">
                                        <span>{model.name}</span>
                                        <span className="text-xs text-muted-foreground">{model.description}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Set as Active Button */}
                {config.isEnabled && !isActive && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveProvider(provider)}
                        className="w-full"
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Set as Active Provider
                    </Button>
                )}
            </div>
        </div>
    );
}

export default function AppsSettingsPage() {
    const [startupPage, setStartupPage] = useState('last-visited');
    const [autoTimezone, setAutoTimezone] = useState(true);
    const [showViewHistory, setShowViewHistory] = useState(true);
    
    const { hasConfiguredProvider, activeProvider } = useAISettingsStore();

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-medium mb-1">Apps Settings</h1>
            </div>

            {/* AI Configuration Section */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-medium">AI Configuration</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                    Configure AI providers to enable intelligent PRD generation, feature extraction, and task creation.
                    {!hasConfiguredProvider() && (
                        <span className="text-amber-600 ml-1">
                            Add at least one API key to enable AI features.
                        </span>
                    )}
                </p>

                {/* Active Provider Info */}
                {activeProvider && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                                Active Provider: {getProviderDisplayName(activeProvider)}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            This provider will be used for AI generations. You can switch providers when generating content.
                        </p>
                    </div>
                )}

                {/* Provider Cards */}
                <div className="space-y-4">
                    <AIProviderCard provider="openai" />
                    <AIProviderCard provider="anthropic" />
                    <AIProviderCard provider="gemini" />
                </div>
            </div>

            <Separator className="my-8" />

            {/* Startup Settings */}
            <div className="mb-8">
                <h2 className="text-base font-medium mb-2">Startup Settings</h2>
                <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-muted-foreground">
                        Choose what to show when Apps starts or when you switch workspaces.
                    </p>
                    <Select value={startupPage} onValueChange={setStartupPage}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="last-visited">Last Visited Page</SelectItem>
                            <SelectItem value="dashboard">Dashboard</SelectItem>
                            <SelectItem value="tasks">Tasks</SelectItem>
                            <SelectItem value="notes">Notes</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Separator className="my-8" />

            {/* Date and Time */}
            <div className="mb-8">
                <h2 className="text-xl font-medium mb-6">Date and Time</h2>

                {/* Auto Timezone */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Set timezone automatically using your location</h3>
                        <p className="text-sm text-muted-foreground">
                            Reminders, notifications and emails are delivered based on your time zone.
                        </p>
                    </div>
                    <Switch
                        checked={autoTimezone}
                        onCheckedChange={setAutoTimezone}
                    />
                </div>

                {/* Time Zone Display */}
                <div>
                    <Label className="text-sm font-normal mb-2 block">Time Zone</Label>
                    <p className="text-sm text-muted-foreground">
                        Current time zone setting.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        (GMT-07:00) US/Arizona (MST)
                    </p>
                </div>
            </div>

            <Separator className="my-8" />

            {/* Privacy */}
            <div className="mb-8">
                <h2 className="text-xl font-medium mb-6">Privacy</h2>

                {/* Cookie Settings */}
                <div className="mb-6">
                    <h3 className="text-base font-medium mb-1">Cookie Settings</h3>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Customize cookies. See Cookies Notice for details.
                        </p>
                        <Select>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Customize" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Accept All</SelectItem>
                                <SelectItem value="necessary">Necessary Only</SelectItem>
                                <SelectItem value="custom">Customize</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Separator className="my-6" />

                {/* Show View History */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Show my view history</h3>
                        <p className="text-sm text-muted-foreground">
                            People with edit or full access will be able to see when you've viewed a page.
                        </p>
                    </div>
                    <Switch
                        checked={showViewHistory}
                        onCheckedChange={setShowViewHistory}
                    />
                </div>
            </div>
        </div>
    );
}
