// Database types generated from Supabase schema
// This file should be regenerated using: npx supabase gen types typescript --project-id ubkywhbguzbyewedxjdj

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    name: string;
                    email: string;
                    avatar: string | null;
                    role: 'admin' | 'member' | 'viewer';
                    phone: string | null;
                    department: string | null;
                    location: string | null;
                    gender: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    email: string;
                    avatar?: string | null;
                    role?: 'admin' | 'member' | 'viewer';
                    phone?: string | null;
                    department?: string | null;
                    location?: string | null;
                    gender?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    email?: string;
                    avatar?: string | null;
                    role?: 'admin' | 'member' | 'viewer';
                    phone?: string | null;
                    department?: string | null;
                    location?: string | null;
                    gender?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            employees: {
                Row: {
                    id: string;
                    first_name: string;
                    last_name: string;
                    email: string;
                    avatar: string | null;
                    role: 'admin' | 'member' | 'viewer';
                    status: 'active' | 'inactive' | 'pending';
                    category: 'Employee' | 'Customers' | 'Partners';
                    employee_id: string;
                    department: string | null;
                    is_active: boolean;
                    phone: string | null;
                    phone_country_code: string | null;
                    birth_date: string | null;
                    gender: 'Male' | 'Female' | 'Other' | null;
                    occupation: string | null;
                    personal_id: string | null;
                    country: string | null;
                    city: string | null;
                    address: string | null;
                    invitation_token: string | null;
                    invited_at: string | null;
                    invited_by: string | null;
                    password_created: boolean;
                    password_created_at: string | null;
                    last_activity_at: string | null;
                    deactivated_at: string | null;
                    deactivated_by: string | null;
                    created_at: string;
                    updated_at: string;
                    is_deleted: boolean;
                };
                Insert: {
                    id?: string;
                    first_name: string;
                    last_name: string;
                    email: string;
                    avatar?: string | null;
                    role?: 'admin' | 'member' | 'viewer';
                    status?: 'active' | 'inactive' | 'pending';
                    category?: 'Employee' | 'Customers' | 'Partners';
                    employee_id: string;
                    department?: string | null;
                    is_active?: boolean;
                    phone?: string | null;
                    phone_country_code?: string | null;
                    birth_date?: string | null;
                    gender?: 'Male' | 'Female' | 'Other' | null;
                    occupation?: string | null;
                    personal_id?: string | null;
                    country?: string | null;
                    city?: string | null;
                    address?: string | null;
                    invitation_token?: string | null;
                    invited_at?: string | null;
                    invited_by?: string | null;
                    password_created?: boolean;
                    password_created_at?: string | null;
                    last_activity_at?: string | null;
                    deactivated_at?: string | null;
                    deactivated_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
                Update: {
                    id?: string;
                    first_name?: string;
                    last_name?: string;
                    email?: string;
                    avatar?: string | null;
                    role?: 'admin' | 'member' | 'viewer';
                    status?: 'active' | 'inactive' | 'pending';
                    category?: 'Employee' | 'Customers' | 'Partners';
                    employee_id?: string;
                    department?: string | null;
                    is_active?: boolean;
                    phone?: string | null;
                    phone_country_code?: string | null;
                    birth_date?: string | null;
                    gender?: 'Male' | 'Female' | 'Other' | null;
                    occupation?: string | null;
                    personal_id?: string | null;
                    country?: string | null;
                    city?: string | null;
                    address?: string | null;
                    invitation_token?: string | null;
                    invited_at?: string | null;
                    invited_by?: string | null;
                    password_created?: boolean;
                    password_created_at?: string | null;
                    last_activity_at?: string | null;
                    deactivated_at?: string | null;
                    deactivated_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
            };
            tasks: {
                Row: {
                    id: string;
                    title: string;
                    description: string | null;
                    status: 'planned' | 'upcoming' | 'completed';
                    order: number;
                    due_date: string | null;
                    labels: string[];
                    assignees: string[];
                    checklists: Json;
                    attachments: Json;
                    activities: Json;
                    subtask_progress: Json | null;
                    comment_count: number;
                    created_at: string;
                    updated_at: string;
                    is_deleted: boolean;
                };
                Insert: {
                    id?: string;
                    title: string;
                    description?: string | null;
                    status?: 'planned' | 'upcoming' | 'completed';
                    order?: number;
                    due_date?: string | null;
                    labels?: string[];
                    assignees?: string[];
                    checklists?: Json;
                    attachments?: Json;
                    activities?: Json;
                    subtask_progress?: Json | null;
                    comment_count?: number;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
                Update: {
                    id?: string;
                    title?: string;
                    description?: string | null;
                    status?: 'planned' | 'upcoming' | 'completed';
                    order?: number;
                    due_date?: string | null;
                    labels?: string[];
                    assignees?: string[];
                    checklists?: Json;
                    attachments?: Json;
                    activities?: Json;
                    subtask_progress?: Json | null;
                    comment_count?: number;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
            };
            notes: {
                Row: {
                    id: string;
                    title: string;
                    content: Json;
                    tags: string[];
                    author_id: string;
                    author_name: string;
                    author_avatar: string | null;
                    created_at: string;
                    updated_at: string;
                    is_deleted: boolean;
                };
                Insert: {
                    id?: string;
                    title: string;
                    content: Json;
                    tags?: string[];
                    author_id: string;
                    author_name: string;
                    author_avatar?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
                Update: {
                    id?: string;
                    title?: string;
                    content?: Json;
                    tags?: string[];
                    author_id?: string;
                    author_name?: string;
                    author_avatar?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
            };
            tags: {
                Row: {
                    id: string;
                    name: string;
                    color: string;
                    category: 'frequency' | 'type' | 'custom';
                };
                Insert: {
                    id?: string;
                    name: string;
                    color: string;
                    category: 'frequency' | 'type' | 'custom';
                };
                Update: {
                    id?: string;
                    name?: string;
                    color?: string;
                    category?: 'frequency' | 'type' | 'custom';
                };
            };
            calendar_events: {
                Row: {
                    id: string;
                    title: string;
                    description: string | null;
                    start_time: string;
                    end_time: string;
                    is_all_day: boolean;
                    repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
                    color: 'yellow' | 'green' | 'pink' | 'purple' | 'blue';
                    guests: string[];
                    notify_before: number | null;
                    location: string | null;
                    attachments: Json;
                    source: 'local' | 'google' | 'outlook' | 'apple' | 'notion';
                    external_id: string | null;
                    created_at: string;
                    updated_at: string;
                    is_deleted: boolean;
                };
                Insert: {
                    id?: string;
                    title: string;
                    description?: string | null;
                    start_time: string;
                    end_time: string;
                    is_all_day?: boolean;
                    repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
                    color?: 'yellow' | 'green' | 'pink' | 'purple' | 'blue';
                    guests?: string[];
                    notify_before?: number | null;
                    location?: string | null;
                    attachments?: Json;
                    source?: 'local' | 'google' | 'outlook' | 'apple' | 'notion';
                    external_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
                Update: {
                    id?: string;
                    title?: string;
                    description?: string | null;
                    start_time?: string;
                    end_time?: string;
                    is_all_day?: boolean;
                    repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
                    color?: 'yellow' | 'green' | 'pink' | 'purple' | 'blue';
                    guests?: string[];
                    notify_before?: number | null;
                    location?: string | null;
                    attachments?: Json;
                    source?: 'local' | 'google' | 'outlook' | 'apple' | 'notion';
                    external_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
            };
            workspaces: {
                Row: {
                    id: string;
                    name: string;
                    icon: string | null;
                    description: string | null;
                    owner_id: string;
                    created_at: string;
                    updated_at: string;
                    is_deleted: boolean;
                };
                Insert: {
                    id?: string;
                    name: string;
                    icon?: string | null;
                    description?: string | null;
                    owner_id: string;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
                Update: {
                    id?: string;
                    name?: string;
                    icon?: string | null;
                    description?: string | null;
                    owner_id?: string;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
            };
            workspace_memberships: {
                Row: {
                    id: string;
                    workspace_id: string;
                    user_id: string;
                    role: 'owner' | 'admin' | 'member' | 'viewer';
                    joined_at: string;
                    invited_by: string | null;
                    status: 'active' | 'invited' | 'suspended';
                };
                Insert: {
                    id?: string;
                    workspace_id: string;
                    user_id: string;
                    role?: 'owner' | 'admin' | 'member' | 'viewer';
                    joined_at?: string;
                    invited_by?: string | null;
                    status?: 'active' | 'invited' | 'suspended';
                };
                Update: {
                    id?: string;
                    workspace_id?: string;
                    user_id?: string;
                    role?: 'owner' | 'admin' | 'member' | 'viewer';
                    joined_at?: string;
                    invited_by?: string | null;
                    status?: 'active' | 'invited' | 'suspended';
                };
            };
            workspace_invitations: {
                Row: {
                    id: string;
                    workspace_id: string;
                    email: string;
                    token: string;
                    invited_by: string;
                    role: 'admin' | 'member' | 'viewer';
                    expires_at: string;
                    status: 'pending' | 'accepted' | 'expired' | 'cancelled';
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    workspace_id: string;
                    email: string;
                    token: string;
                    invited_by: string;
                    role?: 'admin' | 'member' | 'viewer';
                    expires_at: string;
                    status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    workspace_id?: string;
                    email?: string;
                    token?: string;
                    invited_by?: string;
                    role?: 'admin' | 'member' | 'viewer';
                    expires_at?: string;
                    status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
                    created_at?: string;
                };
            };
            calendar_accounts: {
                Row: {
                    id: string;
                    user_id: string;
                    provider: 'google' | 'outlook' | 'apple' | 'notion';
                    email: string;
                    name: string;
                    color: string;
                    is_connected: boolean;
                    is_visible: boolean;
                    last_synced_at: string | null;
                    access_token: string | null;
                    refresh_token: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    provider: 'google' | 'outlook' | 'apple' | 'notion';
                    email: string;
                    name: string;
                    color?: string;
                    is_connected?: boolean;
                    is_visible?: boolean;
                    last_synced_at?: string | null;
                    access_token?: string | null;
                    refresh_token?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    provider?: 'google' | 'outlook' | 'apple' | 'notion';
                    email?: string;
                    name?: string;
                    color?: string;
                    is_connected?: boolean;
                    is_visible?: boolean;
                    last_synced_at?: string | null;
                    access_token?: string | null;
                    refresh_token?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            [_ in never]: never;
        };
    };
}

// Helper type to extract table row types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
