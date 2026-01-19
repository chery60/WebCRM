'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
];

const regions = [
    { code: 'us', name: 'United States' },
    { code: 'uk', name: 'United Kingdom' },
    { code: 'ca', name: 'Canada' },
    { code: 'au', name: 'Australia' },
    { code: 'de', name: 'Germany' },
    { code: 'fr', name: 'France' },
    { code: 'es', name: 'Spain' },
    { code: 'it', name: 'Italy' },
    { code: 'jp', name: 'Japan' },
    { code: 'kr', name: 'South Korea' },
    { code: 'cn', name: 'China' },
    { code: 'in', name: 'India' },
    { code: 'id', name: 'Indonesia' },
    { code: 'br', name: 'Brazil' },
    { code: 'mx', name: 'Mexico' },
];

export default function LanguageRegionSettingsPage() {
    const [language, setLanguage] = useState('en');
    const [region, setRegion] = useState('id'); // Default to Indonesia as shown in Figma
    const [startWeekMonday, setStartWeekMonday] = useState(true);

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-medium mb-1">Language & Region Settings</h1>
            </div>

            {/* Language & Region Section */}
            <div className="mb-8">
                <h2 className="text-xl font-medium mb-6">Language & Region</h2>

                {/* Language */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-base font-medium mb-1">Language</h3>
                            <p className="text-sm text-muted-foreground">
                                Change the language used in the user interface.
                            </p>
                        </div>
                        <Select value={language} onValueChange={setLanguage}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {languages.map((lang) => (
                                    <SelectItem key={lang.code} value={lang.code}>
                                        {lang.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Region */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-base font-medium mb-1">Region</h3>
                            <p className="text-sm text-muted-foreground">
                                Choose what region that you used on this apps.
                            </p>
                        </div>
                        <Select value={region} onValueChange={setRegion}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {regions.map((reg) => (
                                    <SelectItem key={reg.code} value={reg.code}>
                                        {reg.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Start Week on Monday */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Start Week on Monday</h3>
                        <p className="text-sm text-muted-foreground">
                            This will change how all calendars in your app look.
                        </p>
                    </div>
                    <Switch
                        checked={startWeekMonday}
                        onCheckedChange={setStartWeekMonday}
                    />
                </div>
            </div>
        </div>
    );
}
