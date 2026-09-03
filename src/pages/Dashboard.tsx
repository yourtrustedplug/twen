import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { InvoiceList, Invoice } from '@/components/dashboard/InvoiceList';
import { ArrowLeft, Plus, FileText, Users, LogOut, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const LogoIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className="w-6 h-6 text-foreground"
  >
    <path d="M18.5293 15.3193C18.7059 14.8935 19.2943 14.8935 19.4707 15.3193L19.7236 15.9307C20.1556 16.9735 20.9615 17.8062 21.9746 18.2568L22.6924 18.5762C23.1026 18.759 23.1026 19.3562 22.6924 19.5391L21.9326 19.877C20.9449 20.3162 20.1534 21.1194 19.7139 22.1279L19.4668 22.6934C19.2864 23.1075 18.7137 23.1075 18.5332 22.6934L18.2871 22.1279C17.8476 21.1193 17.0552 20.3163 16.0674 19.877L15.3076 19.5391C14.8974 19.3562 14.8974 18.759 15.3076 18.5762L16.0254 18.2568C17.0385 17.8062 17.8445 16.9735 18.2764 15.9307L18.5293 15.3193ZM20.002 2C20.5532 2.00012 21 2.45576 21 2.99219V13.3418C20.3744 13.1207 19.7013 13 19 13C15.6863 13 13 15.6863 13 19C13 20.0932 13.2939 21.1173 13.8047 22H3.99316C3.44463 21.9999 3 21.5507 3 20.9922V9H9C9.55228 9 10 8.55228 10 8V2H20.002ZM8 7H3L8 2.00293V7Z"></path>
  </svg>
);

export default function Dashboard() {
  const { user, isAnonymous, signOut } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch clients count
      const { count, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (clientsError) throw clientsError;

      setInvoices((invoicesData || []) as Invoice[]);
      setClientsCount(count || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load dashboard data.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!user) return;
    setIsDeletingId(id);
    try {
      // Defense-in-depth: also filter by user_id even though RLS enforces it
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;

      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      toast({
        title: 'Invoice deleted',
        description: 'The invoice has been deleted successfully.',
      });
    } catch (error) {
      console.warn('Failed to delete invoice');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete invoice.',
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Calculate stats
  const totalRevenue = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  
  const pendingAmount = invoices
    .filter((inv) => inv.status === 'pending')
    .reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  
  const overdueAmount = invoices
    .filter((inv) => inv.status === 'overdue')
    .reduce((sum, inv) => sum + Number(inv.total_amount), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className={cn(
          "container flex h-16 items-center justify-between px-4",
          isMobile ? "py-[5px]" : "py-3"
        )}>
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <LogoIcon />
              <span className="font-semibold text-lg max-[479px]:hidden">Invofy</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {isAnonymous && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                Demo Mode
              </span>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/clients">
                <Users className="h-4 w-4 mr-2" />
                <span className="max-[479px]:hidden">Clients</span>
              </Link>
            </Button>
            <Button variant="invofy" size="invofy" asChild className="max-[479px]:px-4 max-[479px]:py-2">
              <Link to="/invoice">
                <Plus className="h-4 w-4 mr-2" />
                <span className="max-[479px]:hidden">New Invoice</span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "container py-6 px-4",
        isMobile ? "max-w-full" : "max-w-[1400px]"
      )}>
        <div className="space-y-6">
          {/* Welcome Section */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display">
              Welcome{isAnonymous ? ' to Demo Mode' : ' back'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAnonymous
                ? 'Explore the dashboard with sample data. Sign up to save your work!'
                : 'Here\'s an overview of your invoicing activity.'}
            </p>
          </div>

          {/* Stats Cards */}
          <StatsCards
            totalRevenue={totalRevenue}
            pendingAmount={pendingAmount}
            overdueAmount={overdueAmount}
            totalClients={clientsCount}
          />

          {/* Recent Invoices */}
          <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Invoices</h2>
          </div>
            <InvoiceList
              invoices={invoices}
              onDelete={handleDeleteInvoice}
              isDeleting={isDeletingId}
            />
          </div>

          {/* Upgrade CTA for anonymous users */}
          {isAnonymous && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Ready to save your work?
              </h3>
              <p className="text-muted-foreground mb-4">
                Create a free account to keep your invoices and clients forever.
              </p>
              <Button variant="invofy" size="invofy" asChild>
                <Link to="/signup">Create Account</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
