import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";
export const useCatalogue = () => useQuery(orpc.store.catalogue.queryOptions({ staleTime: 30000 }));
export const useLegal = (id: string) => useQuery(orpc.store.legal.queryOptions({ input: { id } }));
export const useContact = () => useMutation(orpc.store.contact.mutationOptions());
export const useDashboard = () => useQuery(orpc.store.dashboard.queryOptions({ retry: false }));
export const useCheckout = () => useMutation(orpc.store.checkout.mutationOptions());
export const useAccess = () => useMutation(orpc.store.access.mutationOptions());
export const useAdmin = () => useQuery(orpc.administration.overview.queryOptions({ retry: false }));
export const useReadiness = () => useQuery(orpc.readiness.status.queryOptions());
export const useAdminReadiness = () => useQuery(orpc.readiness.administration.queryOptions({ retry: false }));
export function useAdminActions() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: orpc.administration.key() });
    qc.invalidateQueries({ queryKey: orpc.store.key() });
  };
  return {
    plan: useMutation(orpc.administration.plan.mutationOptions({ onSuccess: done })),
    product: useMutation(orpc.administration.product.mutationOptions({ onSuccess: done })),
    ticket: useMutation(orpc.administration.ticket.mutationOptions({ onSuccess: done })),
    legal: useMutation(orpc.administration.legal.mutationOptions({ onSuccess: done })),
    setting: useMutation(orpc.administration.setting.mutationOptions({ onSuccess: done })),
    revoke: useMutation(orpc.administration.revoke.mutationOptions({ onSuccess: done })),
  };
}
