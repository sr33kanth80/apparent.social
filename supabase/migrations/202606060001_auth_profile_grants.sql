-- Ensure the client role can use the RLS-protected tables needed immediately
-- after Supabase auth succeeds. RLS policies still decide which rows are
-- visible/writeable; these grants only allow the authenticated role to reach
-- those policies.

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.founder_profiles to authenticated;
grant select, insert, update on public.investor_criteria to authenticated;
grant select, insert, update on public.user_settings to authenticated;
grant select, insert, update, delete on public.product_launches to authenticated;
grant select, insert, update, delete on public.meetups to authenticated;
grant select, insert, update, delete on public.meetup_rsvps to authenticated;
grant select, insert, update, delete on public.term_reviews to authenticated;
grant select, insert, update, delete on public.user_messages to authenticated;
grant select, insert, update, delete on public.feed_item_actions to authenticated;
grant select, insert, update, delete on public.builder_discovery_states to authenticated;
