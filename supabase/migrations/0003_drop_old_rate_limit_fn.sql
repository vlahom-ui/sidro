-- create or replace function s drugačijim popisom parametara u Postgresu
-- stvara NOVI preopterećeni (overloaded) oblik funkcije, ne zamjenjuje
-- stari. 0002_security_fixes je dodala novi check_and_increment_rate_limit
-- (p_action, p_window_seconds, p_max_requests) ali stari oblik s
-- p_user_id parametrom je ostao pozivljiv sve do ovog eksplicitnog DROP-a.
drop function if exists check_and_increment_rate_limit(uuid, text, integer, integer);
