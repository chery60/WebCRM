'use client';

import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';

interface EmployeeEmptyStateProps {
    onAddClick: () => void;
    isAdmin: boolean;
}

export function EmployeeEmptyState({ onAddClick, isAdmin }: EmployeeEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] px-4">
            {/* Illustration */}
            <div className="relative mb-8">
                <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center">
                    <div className="relative">
                        {/* Magnifying glass icon */}
                        <Search className="w-12 h-12 text-gray-400" />
                        {/* X mark */}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-bold text-xs">✕</span>
                        </div>
                    </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute -top-2 -left-4 w-4 h-4 bg-gray-200 rounded-full opacity-60" />
                <div className="absolute top-4 -right-6 w-3 h-3 bg-gray-200 rounded-full opacity-40" />
                <div className="absolute -bottom-2 left-8 w-2 h-2 bg-gray-200 rounded-full opacity-50" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                Expand Your Network!
            </h2>

            {/* Description */}
            <p className="text-muted-foreground text-center max-w-md mb-6">
                {isAdmin ? (
                    <>
                        It looks like your contact list is off to a quiet start.<br />
                        Add your employees now to stay connected and stay organized.
                    </>
                ) : (
                    <>
                        No employees have been added yet.<br />
                        Contact your administrator to invite team members.
                    </>
                )}
            </p>

            {/* Add Button - Only show for admins */}
            {isAdmin && (
                <Button
                    onClick={onAddClick}
                    className="gap-2 bg-gray-900 hover:bg-gray-800"
                >
                    <Plus className="h-4 w-4" />
                    Invite Employee
                </Button>
            )}
        </div>
    );
}
