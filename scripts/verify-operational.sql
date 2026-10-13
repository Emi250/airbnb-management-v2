-- Prueba transaccional de producción: todos los registros de ensayo se revierten.
-- No llama servicios externos ni envía notificaciones.
begin;
do $$ begin
  perform set_config('request.jwt.claim.sub',(select user_id::text from public.user_roles where role='admin' order by user_id limit 1),true);
end $$;
set local role authenticated;
do $$
declare p uuid; r uuid; g uuid; target uuid; movement uuid:=gen_random_uuid(); v bigint;
  payload jsonb; job jsonb; result jsonb; n integer;
begin
  if public.current_user_role() is distinct from 'admin' then raise exception 'Falta usuario administrador para el ensayo'; end if;
  insert into public.properties(name,active) values('ENSAYO TRANSACCIONAL — se revierte',true) returning id into p;
  payload:=jsonb_build_object('property_id',p,'new_guest_name','ENSAYO TRANSACCIONAL — se revierte',
    'check_in','2036-01-01','check_out','2036-01-03','num_guests',2,'total_amount_ars',10000,
    'amount_paid_ars',1000,'source','direct','status','confirmed','platform_fee_ars',0,'cleaning_fee_ars',0);
  r:=public.save_reservation(null,payload);
  select version,guest_id into v,g from public.reservations where id=r;
  perform public.record_payment(r,v,jsonb_build_object('id',movement,'kind','payment','amount_ars',2000,'paid_on','2026-10-12','method','transfer'));
  perform public.record_payment(r,v,jsonb_build_object('id',movement,'kind','payment','amount_ars',2000,'paid_on','2026-10-12','method','transfer'));
  if (select amount_paid_ars from public.reservations where id=r)<>3000 then raise exception 'Saldo o idempotencia incorrectos'; end if;
  begin
    perform public.save_reservation(r,payload||jsonb_build_object('guest_id',g,'expected_version',v,'amount_paid_ars',3000));
    raise exception 'ACEPTO EDICION OBSOLETA';
  exception when others then
    if sqlerrm not like '%cambió%' then raise; end if;
  end;
  insert into public.guests(name) values('ENSAYO FICHA PRINCIPAL — se revierte') returning id into target;
  perform public.merge_guests(g,target,(select version from public.guests where id=g),1);
  if (select guest_id from public.reservations where id=r)<>target then raise exception 'Unificación incorrecta'; end if;
  select version into v from public.reservations where id=r;
  perform public.record_payment(r,v,jsonb_build_object('id',gen_random_uuid(),'kind','refund','amount_ars',500,'paid_on','2026-10-12','method','transfer','notes','Ensayo reversible'));
  if (select amount_paid_ars from public.reservations where id=r)<>2500 then raise exception 'Devolución incorrecta'; end if;
  job:=public.claim_notion_sync(r,true);
  if job is null or public.claim_notion_sync(r,true) is not null then raise exception 'Bloqueo de sincronización incorrecto'; end if;
  if not public.finish_notion_sync(r,(job->>'lock_token')::uuid,(job->>'generation')::bigint,'error','Ensayo sin envío externo',null) then raise exception 'No se persistió el estado'; end if;
  select count(*) into n from public.audit_events where entity_id=r and actor_id=auth.uid();
  if n<3 then raise exception 'Historial incompleto'; end if;
  delete from public.audit_events where entity_id=r;
  if (select count(*) from public.audit_events where entity_id=r)<>n then raise exception 'El historial permitió borrar registros'; end if;
  result:=public.export_business_backup();
  if result->>'schema_through'<>'0014' or jsonb_array_length(result->'tables'->'reservation_payments')<3 then raise exception 'Respaldo incompleto'; end if;
end $$;
rollback;
select 'Prueba operativa completada; registros de ensayo revertidos' as resultado;
