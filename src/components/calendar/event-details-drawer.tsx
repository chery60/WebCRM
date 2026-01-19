'use client';

import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, MapPin, X, Paperclip, Trash2 } from 'lucide-react';
import type { CalendarEvent } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils'; // Assuming utils exists

interface EventDetailsDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    event: CalendarEvent | null;
    onDelete?: (id: string) => void;
}

export function EventDetailsDrawer({
    open,
    onOpenChange,
    event,
    onDelete,
}: EventDetailsDrawerProps) {
    if (!event) return null;

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
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between border-b shrink-0 space-y-0">
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", {
                            'bg-blue-500': event.color === 'blue',
                            'bg-yellow-500': event.color === 'yellow',
                            'bg-green-500': event.color === 'green',
                            'bg-pink-500': event.color === 'pink',
                            'bg-purple-500': event.color === 'purple',
                        })} />
                        Event Details
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Header Info */}
                    <div>
                        <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
                        {event.description && (
                            <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                        )}
                    </div>

                    <Separator />

                    {/* Time & Date */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="font-medium">
                                    {format(event.startTime, 'EEEE, MMMM d, yyyy')}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {event.isAllDay
                                        ? 'All Day'
                                        : `${format(event.startTime, 'h:mm a')} - ${format(event.endTime, 'h:mm a')}`
                                    }
                                </p>
                            </div>
                        </div>

                        {event.location && (
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <p className="font-medium capitalize">{event.location}</p>
                            </div>
                        )}

                        {event.repeat !== 'none' && (
                            <div className="flex items-start gap-3">
                                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <p className="font-medium capitalize text-sm">Repeats: {event.repeat}</p>
                            </div>
                        )}
                    </div>

                    {/* Guests (Placeholder if needed) */}
                    {event.guests && event.guests.length > 0 && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="text-sm font-medium mb-2 text-muted-foreground">Guests</h3>
                                <div className="flex flex-wrap gap-2">
                                    {event.guests.map((guest, idx) => (
                                        <Badge key={idx} variant="secondary">{guest}</Badge>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Attachments */}
                    {event.attachments && event.attachments.length > 0 && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="text-sm font-medium mb-3 text-muted-foreground">Attachments</h3>
                                <div className="space-y-2">
                                    {event.attachments.map((file) => (
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
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 border-t bg-background flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    {onDelete && (
                        <Button variant="destructive" onClick={() => onDelete(event.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Event
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
