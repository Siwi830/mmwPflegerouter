-- Alternative zur Drizzle-Migration, nicht beides verwenden.
ALTER TABLE help_requests
ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS help_requests_assigned_user_idx ON help_requests(assigned_user_id);
