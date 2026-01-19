import { redirect } from 'next/navigation';

export default function DashboardHomePage() {
    // Redirect to notes as the default dashboard view
    redirect('/notes');
}
