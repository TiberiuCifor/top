-- Run this in your Supabase SQL Editor (supabase.com → project → SQL Editor)

CREATE TABLE IF NOT EXISTS project_lead_evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_lead_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  dim1_score VARCHAR(1),
  dim1_evidence TEXT,
  dim1_sprint_completion NUMERIC,
  dim1_milestones_at_risk TEXT,
  dim2_score VARCHAR(1),
  dim2_evidence TEXT,
  dim2_client_escalations INTEGER,
  dim2_escalations_resolved TEXT,
  dim3_score VARCHAR(1),
  dim3_evidence TEXT,
  dim3_budget_status NUMERIC,
  dim3_scope_changes INTEGER,
  dim3_scope_communicated TEXT,
  dim4_score VARCHAR(1),
  dim4_evidence TEXT,
  dim4_ones_held INTEGER,
  dim4_ones_planned INTEGER,
  dim4_morale_concerns TEXT,
  dim5_score VARCHAR(1),
  dim5_evidence TEXT,
  dim5_expansion_opportunities INTEGER,
  dim5_expansion_details TEXT,
  overall_notes TEXT,
  created_by uuid,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_lead_id, month)
);

CREATE TABLE IF NOT EXISTS squad_lead_evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_lead_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  dim1_score VARCHAR(1),
  dim1_evidence TEXT,
  dim1_ones_held INTEGER,
  dim1_ones_planned INTEGER,
  dim1_development_percent NUMERIC,
  dim2_score VARCHAR(1),
  dim2_evidence TEXT,
  dim2_growth_plan_current INTEGER,
  dim2_growth_plan_total INTEGER,
  dim3_score VARCHAR(1),
  dim3_evidence TEXT,
  dim3_engagement_concerns TEXT,
  dim3_high_potential TEXT,
  dim4_score VARCHAR(1),
  dim4_evidence TEXT,
  dim4_technical_gaps TEXT,
  dim5_score VARCHAR(1),
  dim5_evidence TEXT,
  dim5_content TEXT,
  dim5_ai_skills TEXT,
  overall_notes TEXT,
  created_by uuid,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(squad_lead_id, month)
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE project_lead_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_lead_evaluations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (adjust as needed)
CREATE POLICY "Allow all for authenticated" ON project_lead_evaluations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON squad_lead_evaluations
  FOR ALL USING (true) WITH CHECK (true);
