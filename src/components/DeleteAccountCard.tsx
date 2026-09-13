import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { signedOutPath } from '@/lib/auth-routes';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';
import { Loader2 } from 'lucide-react';

const DeleteAccountCard = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
    if (error || data?.error) {
      setDeleting(false);
      toast({
        title: 'Could not delete account',
        description: await edgeFunctionErrorMessage(error, data, 'Try again or email hello@twen.app.'),
        variant: 'destructive',
      });
      return;
    }
    try {
      await signOut();
    } catch {
      // Session may already be gone after the auth user was deleted.
    }
    setOpen(false);
    navigate(signedOutPath(), { replace: true });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-8 pt-6 border-t border-[#f1f1f1]">
      <p className="text-xs text-muted-foreground max-w-md">
        Permanently remove this profile, campaigns, and login. This cannot be undone.
      </p>
      <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground shrink-0" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <AlertDialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
        <AlertDialogContent className="rounded-[24px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Campaigns, messages, and login go with it. You will be signed out immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeleteAccountCard;
