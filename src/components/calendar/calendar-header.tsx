'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Filter, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarMenu } from './calendar-menu';
import { CalendarSyncDialog } from './calendar-sync-dialog';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { Button } from '@/components/ui/button';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek, setMonth, setYear, getMonth, getYear } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

export type CalendarViewType = 'monthly' | 'weekly' | 'daily';

interface CalendarHeaderProps {
    currentDate: Date;
    view: CalendarViewType;
    onDateChange: (date: Date) => void;
    onViewChange: (view: CalendarViewType) => void;
    onAddEvent: () => void;
}

export function CalendarHeader({
    currentDate,
    view,
    onDateChange,
    onViewChange,
    onAddEvent,
}: CalendarHeaderProps) {
    const { accounts, fetchAccounts, syncAccount, isSyncDialogOpen, setSyncDialogOpen } = useCalendarStore();

    // Fetch calendar accounts on mount
    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    const handleSyncAll = async () => {
        const connectedAccounts = accounts.filter(a => a.isConnected);
        for (const account of connectedAccounts) {
            await syncAccount(account.id);
        }
    };

    const handlePrevious = () => {
        switch (view) {
            case 'monthly':
                onDateChange(subMonths(currentDate, 1));
                break;
            case 'weekly':
                onDateChange(subWeeks(currentDate, 1));
                break;
            case 'daily':
                onDateChange(subDays(currentDate, 1));
                break;
        }
    };

    const handleNext = () => {
        switch (view) {
            case 'monthly':
                onDateChange(addMonths(currentDate, 1));
                break;
            case 'weekly':
                onDateChange(addWeeks(currentDate, 1));
                break;
            case 'daily':
                onDateChange(addDays(currentDate, 1));
                break;
        }
    };

    const handleToday = () => {
        onDateChange(new Date());
    };

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentYear = getYear(new Date());
    const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

    // Generate week options (10 weeks before and after)
    const generateWeekOptions = () => {
        const weeks = [];
        for (let i = -10; i <= 10; i++) {
            const weekDate = addWeeks(currentDate, i);
            const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 });
            const weekEnd = endOfWeek(weekDate, { weekStartsOn: 0 });
            weeks.push({
                value: weekStart.toISOString(),
                label: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
            });
        }
        return weeks;
    };

    const handleMonthChange = (monthIndex: string) => {
        const newDate = setMonth(currentDate, parseInt(monthIndex));
        onDateChange(newDate);
    };

    const handleYearChange = (year: string) => {
        const newDate = setYear(currentDate, parseInt(year));
        onDateChange(newDate);
    };

    const handleWeekChange = (weekStartISO: string) => {
        onDateChange(new Date(weekStartISO));
    };

    const handleDayChange = (date: Date | undefined) => {
        if (date) {
            onDateChange(date);
        }
    };

    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
                <h1 className="text-2xl font-semibold">Calendar</h1>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    {(['monthly', 'weekly', 'daily'] as CalendarViewType[]).map((v) => (
                        <Button
                            key={v}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "capitalize",
                                view === v && "bg-background shadow-sm"
                            )}
                            onClick={() => onViewChange(v)}
                        >
                            {v}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    {/* Monthly View: Month and Year Selectors */}
                    {view === 'monthly' && (
                        <div className="flex items-center gap-2">
                            <Select value={getMonth(currentDate).toString()} onValueChange={handleMonthChange}>
                                <SelectTrigger className="w-[130px] h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((month, index) => (
                                        <SelectItem key={index} value={index.toString()}>
                                            {month}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={getYear(currentDate).toString()} onValueChange={handleYearChange}>
                                <SelectTrigger className="w-[100px] h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((year) => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Weekly View: Week Selector */}
                    {view === 'weekly' && (
                        <Select
                            value={startOfWeek(currentDate, { weekStartsOn: 0 }).toISOString()}
                            onValueChange={handleWeekChange}
                        >
                            <SelectTrigger className="w-[240px] h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {generateWeekOptions().map((week) => (
                                    <SelectItem key={week.value} value={week.value}>
                                        {week.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Daily View: Day Picker */}
                    {view === 'daily' && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-8 justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {format(currentDate, 'MMMM d, yyyy')}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={currentDate}
                                    onSelect={handleDayChange}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevious}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8" onClick={handleToday}>
                            Today
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filter
                    </Button>
                    <Button size="sm" className="gap-2" onClick={onAddEvent}>
                        <Plus className="h-4 w-4" />
                        Add Event
                    </Button>
                    <CalendarMenu 
                        onOpenSyncDialog={() => setSyncDialogOpen(true)} 
                        onSyncAll={handleSyncAll}
                    />
                </div>
            </div>

            {/* Calendar Sync Dialog */}
            <CalendarSyncDialog 
                open={isSyncDialogOpen} 
                onOpenChange={setSyncDialogOpen} 
            />
        </div>
    );
}
