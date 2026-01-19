'use client';

import { useState, useEffect } from 'react';
import { Plus, Image as ImageIcon, Calendar as CalendarIcon, Clock, MapPin, ChevronDown, Check, X, Paperclip, Repeat, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import type { CalendarEvent, EventFormData, EventColor, EventRepeat, EventAttachment } from '@/types';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { v4 as uuidv4 } from 'uuid';

const generateTimeOptions = () => {
    const options = [];
    for (let i = 0; i < 24; i++) {
        for (let j = 0; j < 60; j += 30) {
            const hour = i.toString().padStart(2, '0');
            const minute = j.toString().padStart(2, '0');
            options.push(`${hour}:${minute}`);
        }
    }
    return options;
};

const timeOptions = generateTimeOptions();

interface EventViewEditDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    event: CalendarEvent | null;
    onSave: (id: string, data: EventFormData) => void;
    onDelete?: (id: string) => void;
}

const colorOptions: { value: EventColor; label: string; className: string }[] = [
    { value: 'blue', label: 'Blue', className: 'bg-blue-500' },
    { value: 'yellow', label: 'Yellow', className: 'bg-yellow-500' },
    { value: 'green', label: 'Green', className: 'bg-green-500' },
    { value: 'pink', label: 'Pink', className: 'bg-pink-500' },
    { value: 'purple', label: 'Purple', className: 'bg-purple-500' },
];

const repeatOptions: { value: EventRepeat; label: string; description: string; icon: string }[] = [
    { value: 'none', label: 'Does not repeat', description: 'One-time event', icon: '○' },
    { value: 'daily', label: 'Daily', description: 'Every day', icon: '◉' },
    { value: 'weekly', label: 'Weekly', description: 'Same day each week', icon: '◎' },
    { value: 'monthly', label: 'Monthly', description: 'Same date each month', icon: '◈' },
    { value: 'yearly', label: 'Yearly', description: 'Same date each year', icon: '✦' },
];

export function EventViewEditDrawer({
    open,
    onOpenChange,
    event,
    onSave,
    onDelete,
}: EventViewEditDrawerProps) {
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Form state
    const [title, setTitle] = useState('');
    const [color, setColor] = useState<EventColor>('blue');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [repeat, setRepeat] = useState<EventRepeat>('none');
    const [notifyMe, setNotifyMe] = useState(true);
    const [notifyMinutes, setNotifyMinutes] = useState('30');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [attachments, setAttachments] = useState<EventAttachment[]>([]);

    // Reset form when event changes
    useEffect(() => {
        if (event) {
            setTitle(event.title);
            setColor(event.color || 'blue');
            setDate(new Date(event.startTime));
            setStartTime(format(new Date(event.startTime), 'HH:mm'));
            setEndTime(format(new Date(event.endTime), 'HH:mm'));
            setIsAllDay(event.isAllDay);
            setRepeat(event.repeat);
            setNotifyMe(event.notifyBefore !== null);
            setNotifyMinutes(event.notifyBefore?.toString() || '30');
            setLocation(event.location || '');
            setDescription(event.description || '');
            setAttachments(event.attachments || []);
            setIsEditMode(false); // Always start in view mode
        }
    }, [event]);

    // Reset edit mode when dialog closes
    useEffect(() => {
        if (!open) {
            setIsEditMode(false);
        }
    }, [open]);

    if (!event) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newAttachments: EventAttachment[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();

            const attachment = await new Promise<EventAttachment>((resolve) => {
                reader.onload = (e) => {
                    resolve({
                        id: uuidv4(),
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        data: e.target?.result as string,
                        uploadedAt: new Date(),
                    });
                };
                reader.readAsDataURL(file);
            });
            newAttachments.push(attachment);
        }

        setAttachments(prev => [...prev, ...newAttachments]);
        e.target.value = '';
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    const handleSave = () => {
        if (!date || !event) return;

        const sTime = startTime || '09:00';
        const eTime = endTime || '10:00';

        const dateStr = format(date, 'yyyy-MM-dd');
        const startDateTime = new Date(`${dateStr}T${sTime}:00`);
        const endDateTime = new Date(`${dateStr}T${eTime}:00`);

        onSave(event.id, {
            title,
            color,
            startTime: startDateTime,
            endTime: endDateTime,
            isAllDay,
            repeat,
            guests: event.guests || [],
            notifyBefore: notifyMe ? parseInt(notifyMinutes) : null,
            location: location || null,
            description,
            attachments,
        });

        setIsEditMode(false);
        onOpenChange(false);
    };

    const handleCancel = () => {
        // Reset form to original event values
        if (event) {
            setTitle(event.title);
            setColor(event.color || 'blue');
            setDate(new Date(event.startTime));
            setStartTime(format(new Date(event.startTime), 'HH:mm'));
            setEndTime(format(new Date(event.endTime), 'HH:mm'));
            setIsAllDay(event.isAllDay);
            setRepeat(event.repeat);
            setNotifyMe(event.notifyBefore !== null);
            setNotifyMinutes(event.notifyBefore?.toString() || '30');
            setLocation(event.location || '');
            setDescription(event.description || '');
            setAttachments(event.attachments || []);
        }
        setIsEditMode(false);
    };

    const selectedColorClass = colorOptions.find(c => c.value === color)?.className || 'bg-blue-500';

    const downloadAttachment = (data: string, filename: string) => {
        const link = document.createElement('a');
        link.href = data;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between space-y-0 border-b shrink-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn("w-3 h-3 rounded-full shrink-0", selectedColorClass)} />
                        {isEditMode ? (
                            <Input
                                placeholder="Enter event name here"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="flex-1 border-input text-xl font-semibold h-auto py-1"
                            />
                        ) : (
                            <DialogTitle className="text-xl font-semibold truncate">{title}</DialogTitle>
                        )}
                    </div>
                    {!isEditMode && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 ml-2"
                            onClick={() => setIsEditMode(true)}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Color selector (edit mode only) */}
                    {isEditMode && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Color</Label>
                            <div className="flex gap-2">
                                {colorOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        className={cn(
                                            'w-8 h-8 rounded-full transition-all ring-offset-2 flex items-center justify-center',
                                            opt.className,
                                            color === opt.value && 'ring-2 ring-primary scale-110'
                                        )}
                                        onClick={() => setColor(opt.value)}
                                        title={opt.label}
                                    >
                                        {color === opt.value && <Check className="h-4 w-4 text-white" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Select Time */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Date & Time</Label>
                        {isEditMode ? (
                            <>
                                <div className="grid grid-cols-[1.5fr_1fr_auto_1fr] gap-3 items-center">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-between text-left font-normal border-input px-3",
                                                    !date && "text-muted-foreground"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <span className="truncate">
                                                        {date ? format(date, "MMMM dd, yyyy") : "Select Event Day"}
                                                    </span>
                                                </div>
                                                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={date}
                                                onSelect={setDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>

                                    <div className="relative">
                                        <Select value={startTime} onValueChange={setStartTime} disabled={isAllDay}>
                                            <SelectTrigger className="w-full pl-9">
                                                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                                <SelectValue placeholder="--:-- --" />
                                            </SelectTrigger>
                                            <SelectContent position="popper" className="max-h-[200px]">
                                                {timeOptions.map((time) => (
                                                    <SelectItem key={`start-${time}`} value={time}>
                                                        {time}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <span className="text-muted-foreground text-sm text-center">to</span>

                                    <div className="relative">
                                        <Select value={endTime} onValueChange={setEndTime} disabled={isAllDay}>
                                            <SelectTrigger className="w-full pl-9">
                                                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                                <SelectValue placeholder="--:-- --" />
                                            </SelectTrigger>
                                            <SelectContent position="popper" className="max-h-[200px]">
                                                {timeOptions.map((time) => (
                                                    <SelectItem key={`end-${time}`} value={time}>
                                                        {time}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 pt-1">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="allDay"
                                            checked={isAllDay}
                                            onCheckedChange={(checked) => setIsAllDay(checked as boolean)}
                                            className="rounded-full w-5 h-5 border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <Label htmlFor="allDay" className="text-sm font-normal text-muted-foreground cursor-pointer">All Day</Label>
                                    </div>

                                    <Select value={repeat} onValueChange={(v) => setRepeat(v as EventRepeat)}>
                                        <SelectTrigger className="w-auto h-auto border-none p-0 focus:ring-0 text-muted-foreground hover:text-foreground shadow-none gap-1">
                                            <Repeat className="h-4 w-4" />
                                            <SelectValue placeholder="Repeat" />
                                        </SelectTrigger>
                                        <SelectContent className="w-[220px]">
                                            {repeatOptions.map((option) => (
                                                <SelectItem 
                                                    key={option.value} 
                                                    value={option.value}
                                                    className="py-2"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-base">{option.icon}</span>
                                                        <div>
                                                            <div className="font-medium">{option.label}</div>
                                                            <div className="text-xs text-muted-foreground">{option.description}</div>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-start gap-3">
                                <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        {date ? format(date, 'EEEE, MMMM d, yyyy') : 'No date'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {isAllDay
                                            ? 'All Day'
                                            : `${startTime} - ${endTime}`
                                        }
                                    </p>
                                    {repeat !== 'none' && (
                                        <p className="text-sm text-muted-foreground capitalize mt-1">
                                            <Repeat className="h-3 w-3 inline mr-1" />
                                            Repeats {repeat}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Location</Label>
                        {isEditMode ? (
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Select value={location} onValueChange={setLocation}>
                                    <SelectTrigger className="pl-9 h-11 border-input text-muted-foreground data-[state=checked]:text-foreground">
                                        <SelectValue placeholder="Select Location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new-york">New York</SelectItem>
                                        <SelectItem value="london">London</SelectItem>
                                        <SelectItem value="tokyo">Tokyo</SelectItem>
                                        <SelectItem value="sydney">Sydney</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <p className="font-medium capitalize">{location || 'No location set'}</p>
                            </div>
                        )}
                    </div>

                    {/* Notify Events (edit mode only) */}
                    {isEditMode && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Notify Events</Label>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 mr-2">
                                    <Checkbox
                                        id="notify"
                                        checked={notifyMe}
                                        onCheckedChange={(checked) => setNotifyMe(checked as boolean)}
                                        className="rounded-sm w-4 h-4"
                                    />
                                    <Label htmlFor="notify" className="text-sm font-normal text-muted-foreground cursor-pointer">Notify Me</Label>
                                </div>

                                <Input
                                    type="number"
                                    value={notifyMinutes}
                                    onChange={(e) => setNotifyMinutes(e.target.value)}
                                    className="w-16 h-10 border-input"
                                    disabled={!notifyMe}
                                />

                                <Select defaultValue="minutes" disabled={!notifyMe}>
                                    <SelectTrigger className="w-[110px] h-10 border-input">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="minutes">Minutes</SelectItem>
                                        <SelectItem value="hours">Hours</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Description</Label>
                        {isEditMode ? (
                            <>
                                <Textarea
                                    placeholder="Enter your description here"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    maxLength={500}
                                    className="border-input resize-none min-h-[100px]"
                                />
                                <div className="text-xs text-muted-foreground text-right pt-1">
                                    {description.length}/500
                                </div>
                            </>
                        ) : (
                            <p className="text-muted-foreground whitespace-pre-wrap">
                                {description || 'No description'}
                            </p>
                        )}
                    </div>

                    {/* Attachments */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Attachments</Label>
                        {isEditMode ? (
                            <>
                                <div
                                    className="border-2 border-dashed border-input rounded-xl p-8 text-center bg-white hover:bg-muted/5 transition-colors cursor-pointer relative"
                                    onClick={() => document.getElementById('file-upload-edit')?.click()}
                                >
                                    <input
                                        id="file-upload-edit"
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                    <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/60 mb-3" />
                                    <p className="text-sm text-muted-foreground">
                                        Drag files here or <span className="text-foreground font-medium hover:underline">Browse</span>
                                    </p>
                                </div>

                                {attachments.length > 0 && (
                                    <div className="space-y-2 mt-2">
                                        {attachments.map((file) => (
                                            <div key={file.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/20">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                                    <span className="text-xs text-muted-foreground">({Math.round(file.size / 1024)} KB)</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeAttachment(file.id);
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            attachments.length > 0 ? (
                                <div className="space-y-2">
                                    {attachments.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                                            onClick={() => downloadAttachment(file.data, file.name)}
                                        >
                                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                <Paperclip className="h-5 w-5 text-blue-500" />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="font-medium truncate text-sm">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {Math.round(file.size / 1024)} KB
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">No attachments</p>
                            )
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t bg-background shrink-0">
                    {isEditMode ? (
                        <>
                            <Button
                                variant="secondary"
                                className="flex-1 h-11 bg-muted hover:bg-muted/80 font-medium"
                                onClick={handleCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 h-11 bg-black text-white hover:bg-black/90 font-medium"
                                onClick={handleSave}
                                disabled={!title}
                            >
                                Save
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                className="flex-1 h-11"
                                onClick={() => onOpenChange(false)}
                            >
                                Close
                            </Button>
                            {onDelete && (
                                <Button
                                    variant="destructive"
                                    className="h-11"
                                    onClick={() => onDelete(event.id)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
