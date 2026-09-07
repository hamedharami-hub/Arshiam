
-- Permission enum
CREATE TYPE public.share_permission AS ENUM ('view', 'comment', 'edit');
CREATE TYPE public.share_resource_type AS ENUM ('task', 'note', 'folder');

-- Shares table
CREATE TABLE public.shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  recipient_id uuid,
  recipient_email text NOT NULL,
  resource_type public.share_resource_type NOT NULL,
  resource_id uuid NOT NULL,
  permission public.share_permission NOT NULL DEFAULT 'view',
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_type, resource_id, recipient_email)
);

CREATE INDEX idx_shares_recipient ON public.shares(recipient_id);
CREATE INDEX idx_shares_recipient_email ON public.shares(lower(recipient_email));
CREATE INDEX idx_shares_resource ON public.shares(resource_type, resource_id);
CREATE INDEX idx_shares_owner ON public.shares(owner_id);

ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage shares" ON public.shares
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Recipients view their shares" ON public.shares
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE TRIGGER update_shares_updated_at
BEFORE UPDATE ON public.shares
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: does user have access to a resource (direct share or via parent folder)?
CREATE OR REPLACE FUNCTION public.has_share_access(
  _user_id uuid,
  _resource_type public.share_resource_type,
  _resource_id uuid,
  _min_permission public.share_permission DEFAULT 'view'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH levels AS (
    SELECT CASE _min_permission
      WHEN 'view' THEN 1
      WHEN 'comment' THEN 2
      WHEN 'edit' THEN 3
    END AS min_lvl
  )
  SELECT EXISTS (
    -- Direct share on this resource
    SELECT 1 FROM public.shares s, levels
    WHERE s.recipient_id = _user_id
      AND s.resource_type = _resource_type
      AND s.resource_id = _resource_id
      AND CASE s.permission WHEN 'view' THEN 1 WHEN 'comment' THEN 2 WHEN 'edit' THEN 3 END >= levels.min_lvl
    UNION ALL
    -- Cascading: task/note inside a shared folder
    SELECT 1 FROM public.shares s, levels
    WHERE s.recipient_id = _user_id
      AND s.resource_type = 'folder'
      AND CASE s.permission WHEN 'view' THEN 1 WHEN 'comment' THEN 2 WHEN 'edit' THEN 3 END >= levels.min_lvl
      AND (
        (_resource_type = 'task' AND s.resource_id = (SELECT folder_id FROM public.tasks WHERE id = _resource_id))
        OR
        (_resource_type = 'note' AND s.resource_id = (SELECT folder_id FROM public.notes WHERE id = _resource_id))
      )
  );
$$;

-- Extend RLS on tasks
CREATE POLICY "Recipients view shared tasks" ON public.tasks
  FOR SELECT USING (public.has_share_access(auth.uid(), 'task', id, 'view'));

CREATE POLICY "Recipients with comment can update shared tasks" ON public.tasks
  FOR UPDATE USING (public.has_share_access(auth.uid(), 'task', id, 'comment'));

-- Extend RLS on notes
CREATE POLICY "Recipients view shared notes" ON public.notes
  FOR SELECT USING (public.has_share_access(auth.uid(), 'note', id, 'view'));

CREATE POLICY "Recipients with edit can update shared notes" ON public.notes
  FOR UPDATE USING (public.has_share_access(auth.uid(), 'note', id, 'edit'));

-- Extend RLS on folders
CREATE POLICY "Recipients view shared folders" ON public.folders
  FOR SELECT USING (public.has_share_access(auth.uid(), 'folder', id, 'view'));

-- Auto-link pending shares when a user signs up with matching email
CREATE OR REPLACE FUNCTION public.link_shares_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.shares
  SET recipient_id = NEW.id,
      accepted_at = COALESCE(accepted_at, now())
  WHERE recipient_id IS NULL
    AND lower(recipient_email) = lower(NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_link_shares
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_shares_on_signup();
