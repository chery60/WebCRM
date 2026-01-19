'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Check, Download, CreditCard, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

interface Invoice {
    id: string;
    date: string;
    amount: string;
    status: 'paid' | 'pending' | 'failed';
    downloadUrl: string;
}

const invoices: Invoice[] = [
    { id: 'INV-2024-001', date: 'Jan 1, 2024', amount: '$29.00', status: 'paid', downloadUrl: '#' },
    { id: 'INV-2023-012', date: 'Dec 1, 2023', amount: '$29.00', status: 'paid', downloadUrl: '#' },
    { id: 'INV-2023-011', date: 'Nov 1, 2023', amount: '$29.00', status: 'paid', downloadUrl: '#' },
    { id: 'INV-2023-010', date: 'Oct 1, 2023', amount: '$29.00', status: 'paid', downloadUrl: '#' },
];

const plans = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        features: [
            'Up to 5 team members',
            '500 MB storage',
            'Basic features',
            'Community support',
        ],
        current: false,
    },
    {
        name: 'Pro',
        price: '$29',
        period: 'per month',
        features: [
            'Up to 50 team members',
            '50 GB storage',
            'Advanced features',
            'Priority support',
            'Custom integrations',
            'Advanced analytics',
        ],
        current: true,
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        period: 'contact us',
        features: [
            'Unlimited team members',
            'Unlimited storage',
            'All features',
            'Dedicated support',
            'Custom integrations',
            'Advanced security',
            'SLA guarantee',
        ],
        current: false,
    },
];

export default function WorkspaceBillingSettingsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState({
        cardNumber: '•••• •••• •••• 4242',
        cardHolder: 'John Doe',
        expiryDate: '12/25',
    });

    const handleUpdatePaymentMethod = () => {
        toast.info('Payment method update coming soon');
    };

    const handleDownloadInvoice = (invoice: Invoice) => {
        toast.success(`Downloading ${invoice.id}`);
    };

    const handleChangePlan = (planName: string) => {
        if (planName === 'Pro') return; // Current plan
        toast.info(`Plan change to ${planName} coming soon`);
    };

    return (
        <div className="p-8 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-semibold mb-2">Billing</h1>
                <p className="text-muted-foreground">
                    Manage your subscription, billing information, and invoices
                </p>
            </div>

            {/* Current Plan */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>
                        You are currently on the Pro plan
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-semibold">Pro Plan</h3>
                                <Badge>Active</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                $29 per month • Renews on February 1, 2024
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline">Cancel Subscription</Button>
                            <Button>Upgrade Plan</Button>
                        </div>
                    </div>

                    {/* Usage */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Team Members</p>
                            <p className="text-2xl font-semibold">12 / 50</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Storage Used</p>
                            <p className="text-2xl font-semibold">8.5 / 50 GB</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Active Projects</p>
                            <p className="text-2xl font-semibold">24</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Available Plans */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Available Plans</CardTitle>
                    <CardDescription>
                        Choose the plan that best fits your team's needs
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative p-6 border rounded-lg ${
                                    plan.current ? 'border-primary shadow-md' : ''
                                }`}
                            >
                                {plan.current && (
                                    <Badge className="absolute top-4 right-4">Current</Badge>
                                )}
                                <div className="mb-4">
                                    <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold">{plan.price}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {plan.period}
                                        </span>
                                    </div>
                                </div>
                                <ul className="space-y-3 mb-6">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm">
                                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    variant={plan.current ? 'outline' : 'default'}
                                    className="w-full"
                                    disabled={plan.current}
                                    onClick={() => handleChangePlan(plan.name)}
                                >
                                    {plan.current ? 'Current Plan' : plan.name === 'Enterprise' ? 'Contact Sales' : 'Upgrade'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                    <CardDescription>
                        Update your billing and payment information
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-muted">
                                <CreditCard className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="font-medium">{paymentMethod.cardNumber}</div>
                                <p className="text-sm text-muted-foreground">
                                    Expires {paymentMethod.expiryDate}
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleUpdatePaymentMethod}>
                            Update
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Billing Information */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Billing Information</CardTitle>
                    <CardDescription>
                        Update your billing address and tax information
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="company-name">Company Name</Label>
                            <Input id="company-name" placeholder="Your Company Inc." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tax-id">Tax ID / VAT Number</Label>
                            <Input id="tax-id" placeholder="GB123456789" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" placeholder="123 Business Street" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" placeholder="San Francisco" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state">State / Province</Label>
                            <Input id="state" placeholder="CA" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="postal">Postal Code</Label>
                            <Input id="postal" placeholder="94102" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline">Cancel</Button>
                        <Button>Save Changes</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Billing History */}
            <Card>
                <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>
                        View and download your past invoices
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.id}</TableCell>
                                    <TableCell>{invoice.date}</TableCell>
                                    <TableCell>{invoice.amount}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                invoice.status === 'paid'
                                                    ? 'default'
                                                    : invoice.status === 'pending'
                                                    ? 'secondary'
                                                    : 'destructive'
                                            }
                                        >
                                            {invoice.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDownloadInvoice(invoice)}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
