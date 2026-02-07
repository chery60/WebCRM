'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { EmployeeCategory } from '@/types';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Loader2, Upload, Calendar, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const formSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    role: z.enum(['admin', 'member', 'viewer']).optional(),
    department: z.string().optional(),
    phone: z.string().optional(),
    phoneCountryCode: z.string().optional(),
    personalId: z.string().optional(),
    birthDate: z.string().optional(),
    occupation: z.string().optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    category: z.enum(['Employee', 'Customers', 'Partners']).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const countries = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'India'];

export function AddEmployeeDialog({ open, onOpenChange, onSuccess }: AddEmployeeDialogProps) {
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [departmentOpen, setDepartmentOpen] = useState(false);
    const [newDepartmentInput, setNewDepartmentInput] = useState('');
    const { addEmployee, getAllDepartments, addDepartment } = useEmployeeStore();
    const { currentUser } = useAuthStore();
    const { currentWorkspace } = useWorkspaceStore();

    // Get all available departments dynamically
    const departments = getAllDepartments();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            role: 'member',
            department: '',
            phone: '',
            phoneCountryCode: '+1',
            personalId: '',
            birthDate: '',
            occupation: '',
            gender: undefined,
            country: '',
            city: '',
            address: '',
            category: 'Employee',
        },
    });

    const isLoading = form.formState.isSubmitting;
    const firstName = form.watch('firstName');
    const lastName = form.watch('lastName');

    const onSubmit = async (values: FormData) => {
        if (!currentUser) {
            toast.error('You must be logged in to add employees');
            return;
        }

        if (!currentWorkspace?.id) {
            toast.error('Please select a workspace first');
            return;
        }

        const result = await addEmployee(
            {
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                department: values.department,
                phone: values.phone,
                phoneCountryCode: values.phoneCountryCode,
                personalId: values.personalId,
                birthDate: values.birthDate ? new Date(values.birthDate) : undefined,
                occupation: values.occupation,
                gender: values.gender,
                country: values.country,
                city: values.city,
                address: values.address,
                category: values.category as EmployeeCategory,
                avatar: avatarPreview || undefined,
            },
            currentUser.role,
            currentUser.id,
            currentWorkspace.id
        );

        if (result) {
            form.reset();
            setAvatarPreview(null);
            onOpenChange(false);
            onSuccess?.();
        }
    };

    const handleCancel = () => {
        form.reset();
        setAvatarPreview(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Employee</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Avatar Upload */}
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border-2 border-dashed border-muted-foreground/30">
                                {avatarPreview ? (
                                    <AvatarImage src={avatarPreview} alt="Avatar preview" />
                                ) : (
                                    <AvatarFallback className="bg-muted text-muted-foreground">
                                        {firstName?.charAt(0) || lastName?.charAt(0) || '?'}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                            <Button type="button" variant="outline" size="sm" className="gap-2">
                                <Upload className="h-4 w-4" />
                                Upload Image
                            </Button>
                        </div>

                        {/* Name Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter first name here" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter last name here" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Department & Email */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="department"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Department</FormLabel>
                                        <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={departmentOpen}
                                                        className={cn(
                                                            "justify-between font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value || "Select department"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[250px] p-0" align="start">
                                                <Command>
                                                    <CommandInput
                                                        placeholder="Search or create..."
                                                        value={newDepartmentInput}
                                                        onValueChange={setNewDepartmentInput}
                                                    />
                                                    <CommandList>
                                                        <CommandEmpty>
                                                            <div className="py-2 px-2">
                                                                <p className="text-sm text-muted-foreground mb-2">No department found.</p>
                                                                {newDepartmentInput.trim() && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="w-full gap-2"
                                                                        onClick={() => {
                                                                            const newDept = newDepartmentInput.trim();
                                                                            addDepartment(newDept);
                                                                            field.onChange(newDept);
                                                                            setNewDepartmentInput('');
                                                                            setDepartmentOpen(false);
                                                                        }}
                                                                    >
                                                                        <Plus className="h-4 w-4" />
                                                                        Create "{newDepartmentInput.trim()}"
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {departments.map((dept) => (
                                                                <CommandItem
                                                                    key={dept}
                                                                    value={dept}
                                                                    onSelect={() => {
                                                                        field.onChange(dept);
                                                                        setDepartmentOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            field.value === dept ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {dept}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                        {newDepartmentInput.trim() && !departments.some(d => d.toLowerCase() === newDepartmentInput.toLowerCase()) && (
                                                            <>
                                                                <CommandSeparator />
                                                                <CommandGroup>
                                                                    <CommandItem
                                                                        onSelect={() => {
                                                                            const newDept = newDepartmentInput.trim();
                                                                            addDepartment(newDept);
                                                                            field.onChange(newDept);
                                                                            setNewDepartmentInput('');
                                                                            setDepartmentOpen(false);
                                                                        }}
                                                                    >
                                                                        <Plus className="mr-2 h-4 w-4" />
                                                                        Create "{newDepartmentInput.trim()}"
                                                                    </CommandItem>
                                                                </CommandGroup>
                                                            </>
                                                        )}
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Access Level</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Access Level" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="member">Member</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="viewer">Viewer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter email here" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Phone & Personal ID */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone</FormLabel>
                                        <div className="flex gap-2">
                                            <Select
                                                value={form.watch('phoneCountryCode')}
                                                onValueChange={(v) => form.setValue('phoneCountryCode', v)}
                                            >
                                                <SelectTrigger className="w-20">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="+1">+1</SelectItem>
                                                    <SelectItem value="+44">+44</SelectItem>
                                                    <SelectItem value="+91">+91</SelectItem>
                                                    <SelectItem value="+49">+49</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormControl>
                                                <Input placeholder="Enter phone number" {...field} className="flex-1" />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="personalId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Personal ID / Passport</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter personal ID here" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Birth Date & Occupation */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="birthDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Birth Date</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type="date" {...field} />
                                                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="occupation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Occupation</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter occupation here" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Gender */}
                        <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Gender</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Male" id="male" />
                                                <Label htmlFor="male">Male</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Female" id="female" />
                                                <Label htmlFor="female">Female</Label>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Country & City */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="country"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Country</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select country" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {countries.map((country) => (
                                                    <SelectItem key={country} value={country}>
                                                        {country}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cities</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Cities" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Austin">Austin</SelectItem>
                                                <SelectItem value="New York">New York</SelectItem>
                                                <SelectItem value="Los Angeles">Los Angeles</SelectItem>
                                                <SelectItem value="Chicago">Chicago</SelectItem>
                                                <SelectItem value="Houston">Houston</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Address */}
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter address here" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
