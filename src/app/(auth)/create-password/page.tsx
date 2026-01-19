'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db/dexie';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const formSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type FormData = z.infer<typeof formSchema>;

// Loading fallback for Suspense
function CreatePasswordLoading() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
}

// Main content component that uses useSearchParams
function CreatePasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [passwordAlreadyCreated, setPasswordAlreadyCreated] = useState(false);
    const [employeeEmail, setEmployeeEmail] = useState('');

    const token = searchParams?.get('token');

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                toast.error('Invalid invitation link');
                setLoading(false);
                return;
            }

            try {
                // Find employee with this invitation token
                const employee = await db.employees
                    .where('invitationToken')
                    .equals(token)
                    .first();

                if (!employee) {
                    toast.error('Invalid or expired invitation link');
                    setLoading(false);
                    return;
                }

                // Check if password already created
                if (employee.passwordCreated) {
                    setPasswordAlreadyCreated(true);
                    setEmployeeEmail(employee.email);
                    setLoading(false);
                    return;
                }

                setTokenValid(true);
                setEmployeeEmail(employee.email);
                setLoading(false);
            } catch (error) {
                console.error('Error validating token:', error);
                toast.error('Failed to validate invitation');
                setLoading(false);
            }
        };

        validateToken();
    }, [token]);

    const onSubmit = async (values: FormData) => {
        if (!token) return;

        try {
            // Find employee and update password status
            const employee = await db.employees
                .where('invitationToken')
                .equals(token)
                .first();

            if (!employee) {
                toast.error('Invalid invitation link');
                return;
            }

            // In a real app, you would hash the password and store it
            // For now, we just mark that the password has been created
            await db.employees.update(employee.id, {
                passwordCreated: true,
                passwordCreatedAt: new Date(),
                status: 'active',
                updatedAt: new Date(),
            });

            // Also update the users table for authentication
            const existingUser = await db.users.where('email').equals(employee.email).first();
            if (existingUser) {
                // Update existing user with password
                await db.users.update(existingUser.id, {
                    password: values.password,
                });
            } else {
                // Create new user with password
                await db.users.add({
                    id: employee.id,
                    name: `${employee.firstName} ${employee.lastName}`,
                    email: employee.email,
                    password: values.password,
                    avatar: employee.avatar,
                    role: employee.role,
                });
            }

            toast.success('Password created successfully!');

            // Redirect to sign in page after 2 seconds
            setTimeout(() => {
                router.push('/signin');
            }, 2000);
        } catch (error) {
            console.error('Error creating password:', error);
            toast.error('Failed to create password');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-muted-foreground">Validating invitation...</div>
            </div>
        );
    }

    if (passwordAlreadyCreated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
                <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border">
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold">Password Already Created</h1>
                        <p className="text-muted-foreground">
                            You have already created a password for {employeeEmail}.
                        </p>
                    </div>
                    <Link href="/signin">
                        <Button className="w-full">Go to Login Page</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
                <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border">
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold">Invalid Invitation</h1>
                        <p className="text-muted-foreground">
                            This invitation link is invalid or has expired.
                        </p>
                    </div>
                    <Link href="/signin">
                        <Button className="w-full" variant="outline">Go to Login Page</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Create Password</h1>
                    <p className="text-muted-foreground">
                        Create a password for your venture account.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {employeeEmail}
                    </p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Password"
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                placeholder="Password"
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={form.formState.isSubmitting}
                        >
                            Create Password
                        </Button>
                    </form>
                </Form>

                <p className="text-center text-sm text-muted-foreground">
                    ©2023 Venture. All rights reserved
                </p>
            </div>
        </div>
    );
}

// Default export wrapped in Suspense for useSearchParams
export default function CreatePasswordPage() {
    return (
        <Suspense fallback={<CreatePasswordLoading />}>
            <CreatePasswordContent />
        </Suspense>
    );
}
