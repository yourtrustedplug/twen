import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Eye, Trash2, FileText } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export interface Invoice {
  id: string;
  invoice_number: string;
  client_details: {
    name?: string;
    company?: string;
  };
  total_amount: number;
  currency: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  issue_date: string;
  due_date: string;
}

interface InvoiceListProps {
  invoices: Invoice[];
  onDelete: (id: string) => void;
  isDeleting?: string | null;
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  paid: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700' },
};

const getCurrencySymbol = (code: string) => {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$',
    JPY: '¥',
    INR: '₹',
  };
  return symbols[code] || '$';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export function InvoiceList({ invoices, onDelete, isDeleting }: InvoiceListProps) {
  const isMobile = useIsMobile();

  if (invoices.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No invoices yet</h3>
            <p className="text-muted-foreground mb-4">Create your first invoice to get started.</p>
            <Button variant="invofy" size="invofy" asChild>
              <Link to="/invoice">Create Invoice</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="border-border">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-foreground">{invoice.invoice_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.client_details?.company || invoice.client_details?.name || 'No client'}
                  </p>
                </div>
                <Badge className={`${statusStyles[invoice.status].bg} ${statusStyles[invoice.status].text} border-0`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </Badge>
              </div>
              <div className="flex justify-between items-center mb-3">
                <p className="text-lg font-bold text-foreground">
                  {getCurrencySymbol(invoice.currency)}
                  {invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">
                  Due: {formatDate(invoice.due_date)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to={`/invoice/${invoice.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {invoice.invoice_number}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(invoice.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting === invoice.id ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card className="border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
              <TableCell>
                {invoice.client_details?.company || invoice.client_details?.name || 'No client'}
              </TableCell>
              <TableCell>
                {getCurrencySymbol(invoice.currency)}
                {invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell>
                <Badge className={`${statusStyles[invoice.status].bg} ${statusStyles[invoice.status].text} border-0`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(invoice.due_date)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/invoice/${invoice.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {invoice.invoice_number}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(invoice.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting === invoice.id ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
