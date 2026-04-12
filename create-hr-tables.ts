import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.leave_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      staff_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.payslips (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      staff_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid')),
      date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.financials (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      staff_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('Bonus', 'Fine', 'Loan')),
      amount NUMERIC NOT NULL,
      date DATE NOT NULL,
      status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Paid', 'Active')),
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.financials ENABLE ROW LEVEL SECURITY;

    -- Leave Requests Policies
    DROP POLICY IF EXISTS "Admins can manage leave requests" ON public.leave_requests;
    CREATE POLICY "Admins can manage leave requests" ON public.leave_requests FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
    
    DROP POLICY IF EXISTS "Users can view their own leave requests" ON public.leave_requests;
    CREATE POLICY "Users can view their own leave requests" ON public.leave_requests FOR SELECT USING (staff_id = auth.uid());
    
    DROP POLICY IF EXISTS "Users can insert their own leave requests" ON public.leave_requests;
    CREATE POLICY "Users can insert their own leave requests" ON public.leave_requests FOR INSERT WITH CHECK (staff_id = auth.uid());

    -- Payslips Policies
    DROP POLICY IF EXISTS "Admins can manage payslips" ON public.payslips;
    CREATE POLICY "Admins can manage payslips" ON public.payslips FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
    
    DROP POLICY IF EXISTS "Users can view their own payslips" ON public.payslips;
    CREATE POLICY "Users can view their own payslips" ON public.payslips FOR SELECT USING (staff_id = auth.uid());

    -- Financials Policies
    DROP POLICY IF EXISTS "Admins can manage financials" ON public.financials;
    CREATE POLICY "Admins can manage financials" ON public.financials FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
    
    DROP POLICY IF EXISTS "Users can view their own financials" ON public.financials;
    CREATE POLICY "Users can view their own financials" ON public.financials FOR SELECT USING (staff_id = auth.uid());
    
    DROP POLICY IF EXISTS "Users can insert their own loan requests" ON public.financials;
    CREATE POLICY "Users can insert their own loan requests" ON public.financials FOR INSERT WITH CHECK (staff_id = auth.uid() AND type = 'Loan');
  `;

  // Supabase JS client doesn't have a built-in way to execute raw SQL easily without RPC.
  // Wait, I can just use the REST API or write an RPC, but maybe I can just add it to supabase-schema.sql and we don't need to run it if the user resets?
  // Actually, I can use `supabase.rpc` or just use `pg` directly if I have the connection string.
  // Wait, I can just use `fetch` to the Supabase REST API or use the `pg` module.
}

createTables();
