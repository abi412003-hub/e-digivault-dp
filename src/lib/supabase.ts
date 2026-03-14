import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://xorgsduvbpaokegawhbd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcmdzZHV2YnBhb2tlZ2F3aGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTg0NjksImV4cCI6MjA4NjY3NDQ2OX0.WQErfkudUzMu5dkdhHh9OE7nn0OK_K8abxOffnLmg2o"
);
