begin;
create function public.export_business_backup() returns jsonb
language plpgsql security invoker set search_path=public as $$
begin
  if public.current_user_role() is distinct from 'admin' then raise exception 'Acceso restringido'; end if;
  return (select jsonb_build_object('format',1,'project','hdapnhttahaifkhvepbc','created_at',now(),'schema_through','0014',
    'tables',jsonb_build_object(
      'properties',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.properties t),
      'guests',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.guests t),
      'reservations',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.reservations t),
      'expenses',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.expenses t),
      'exchange_rates',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.exchange_rates t),
      'user_roles',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.user_roles t),
      'fixed_expense_items',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.fixed_expense_items t),
      'fixed_expense_checks',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.fixed_expense_checks t),
      'monthly_targets',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.monthly_targets t),
      'reservation_payments',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.reservation_payments t),
      'audit_events',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.audit_events t),
      'notion_sync_jobs',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.notion_sync_jobs t)
    )));
end;
$$;
commit;

