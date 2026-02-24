-- Postgres funkce pro Auth Hook "Before user created".
-- Povolí pouze e-maily z domén example123.cz a libovolné další, které přidáte do pole allowed_domains.
-- V Supabase: Authentication → Hooks → Add hook → Before user created → Hook type: Postgres → vyberte tuto funkci.

CREATE OR REPLACE FUNCTION public.before_user_created_allow_domains(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  user_domain text;
  allowed_domains text[] := ARRAY[
    'example123.cz'
    -- přidejte další povolené domény, např. 'vase-firma.cz'
  ];
BEGIN
  user_email := event->'user'->>'email';
  IF user_email IS NULL OR user_email = '' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object('http_code', 400, 'message', 'Missing email')
    );
  END IF;

  user_domain := LOWER(TRIM(split_part(user_email, '@', 2)));
  IF user_domain = '' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object('http_code', 400, 'message', 'Invalid email')
    );
  END IF;

  IF user_domain = ANY(allowed_domains) THEN
    RETURN '{}'::jsonb;  /* povolit */
  END IF;

  RETURN jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 400,
      'message', 'Registrace je povolena jen z vybraných domén.'
    )
  );
END;
$$;

-- Aby Auth mohl funkci volat
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.before_user_created_allow_domains(jsonb) TO supabase_auth_admin;
