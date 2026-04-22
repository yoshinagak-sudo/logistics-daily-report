-- 物流AI日報 初期スキーマ
-- 対象: 物流会社向け外販SaaS

-- 会社（マルチテナント対応）
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ユーザープロフィール（Supabase auth.users と1対1）
-- role: driver / admin / dispatcher
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('driver', 'admin', 'dispatcher')),
  phone text,
  created_at timestamptz not null default now()
);
create index if not exists idx_profiles_company on profiles(company_id);
create index if not exists idx_profiles_role on profiles(company_id, role);

-- 車両
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  number_plate text not null,
  nickname text,
  vehicle_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_vehicles_company on vehicles(company_id);

-- 日報（1ドライバー × 1日 × 1レコード）
create table if not exists daily_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  driver_id uuid not null references profiles(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  report_date date not null,

  -- タイムスタンプ各種
  clock_in_at timestamptz,
  depart_at timestamptz,
  return_at timestamptz,
  clock_out_at timestamptz,

  -- メーター
  odometer_start integer,
  odometer_end integer,
  total_distance_km integer,

  -- 件数・サマリー
  delivery_count integer default 0,

  -- 給油・高速など
  refueled boolean default false,
  used_highway boolean default false,

  -- 異常・特記
  has_anomaly boolean default false,

  -- 自由記述（音声入力含む）
  notes text,

  -- AI関連
  ai_summary text,
  raw_voice_text text,

  -- 提出ステータス
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved')),
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references profiles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(driver_id, report_date)
);
create index if not exists idx_daily_reports_company_date on daily_reports(company_id, report_date desc);
create index if not exists idx_daily_reports_driver on daily_reports(driver_id, report_date desc);
create index if not exists idx_daily_reports_status on daily_reports(company_id, status);

-- 配送実績（1日報に複数配送）
create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references daily_reports(id) on delete cascade,
  destination text not null,
  arrived_at timestamptz,
  completed_at timestamptz,
  notes text,
  receipt_image_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_deliveries_report on deliveries(daily_report_id);

-- 休憩記録（1日報に複数休憩）
create table if not exists breaks (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references daily_reports(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_breaks_report on breaks(daily_report_id);

-- 異常・トラブル報告
create table if not exists anomalies (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references daily_reports(id) on delete cascade,
  category text not null check (category in ('vehicle', 'delay', 'accident', 'damage', 'near_miss', 'other')),
  severity text not null default 'low' check (severity in ('low', 'medium', 'high')),
  description text not null,
  image_url text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_anomalies_report on anomalies(daily_report_id);
create index if not exists idx_anomalies_unresolved on anomalies(resolved) where resolved = false;

-- 車両点検記録
create table if not exists vehicle_inspections (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references daily_reports(id) on delete cascade,
  inspection_type text not null check (inspection_type in ('pre_departure', 'post_return')),
  tire_ok boolean,
  light_ok boolean,
  brake_ok boolean,
  oil_ok boolean,
  body_ok boolean,
  refrigeration_temp numeric,
  notes text,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_inspections_report on vehicle_inspections(daily_report_id);

-- メーター画像（OCR結果保存用）
create table if not exists odometer_captures (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references daily_reports(id) on delete cascade,
  capture_type text not null check (capture_type in ('start', 'end')),
  image_url text not null,
  ocr_value integer,
  ocr_confidence numeric,
  confirmed_value integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_odometer_report on odometer_captures(daily_report_id);

-- updated_at 自動更新
create or replace function trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on daily_reports;
create trigger set_updated_at before update on daily_reports
  for each row execute function trigger_set_updated_at();

-- RLS（Row Level Security）有効化
alter table companies enable row level security;
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table daily_reports enable row level security;
alter table deliveries enable row level security;
alter table breaks enable row level security;
alter table anomalies enable row level security;
alter table vehicle_inspections enable row level security;
alter table odometer_captures enable row level security;

-- ヘルパー関数: 現在ユーザーの会社ID
create or replace function auth_company_id()
returns uuid as $$
  select company_id from profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function auth_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- RLSポリシー（同一会社のメンバーのみアクセス可、driverは自分の日報のみ書込可）

-- profiles: 同社プロフィール参照可、自分のみ更新可
create policy "profiles_select_same_company" on profiles for select
  using (company_id = auth_company_id());
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid());

-- vehicles: 同社のみ参照、admin/dispatcher のみ書込
create policy "vehicles_select_same_company" on vehicles for select
  using (company_id = auth_company_id());
create policy "vehicles_write_admin" on vehicles for all
  using (company_id = auth_company_id() and auth_role() in ('admin', 'dispatcher'))
  with check (company_id = auth_company_id() and auth_role() in ('admin', 'dispatcher'));

-- daily_reports: 同社参照可、driverは自分のみ書込、admin/dispatcherは全件書込
create policy "reports_select_same_company" on daily_reports for select
  using (company_id = auth_company_id());
create policy "reports_insert_self" on daily_reports for insert
  with check (
    company_id = auth_company_id()
    and (driver_id = auth.uid() or auth_role() in ('admin', 'dispatcher'))
  );
create policy "reports_update_self_or_admin" on daily_reports for update
  using (
    company_id = auth_company_id()
    and (driver_id = auth.uid() or auth_role() in ('admin', 'dispatcher'))
  );

-- 子テーブル: 親 daily_reports の権限に追従
create policy "deliveries_same_company" on deliveries for all
  using (exists (select 1 from daily_reports r where r.id = daily_report_id and r.company_id = auth_company_id()))
  with check (exists (select 1 from daily_reports r where r.id = daily_report_id and r.company_id = auth_company_id()));

create policy "breaks_same_company" on breaks for all
  using (exists (select 1 from daily_reports r where r.id = daily_report_id and r.company_id = auth_company_id()))
  with check (exists (select 1 from daily_reports r where r.id = daily_report_id and r.company_id = auth_company_id()));

create policy "anomalies_same_company" on anomalies for all
  using (exists (select 1 from daily_reports r where r.id = daily_report_id and r.company_id = auth_company_id()))
  with check (exists (select 1 from daily_reports r where r.id = daily_report_id and r.company_id = auth_company_id()));

create policy "inspections_same_company" on vehicle_inspections for all
  using (exists (select 1 from daily_reports r where r.id = daily_report_id and r.company_id = auth_company_id()))
  with check (exists (select 1 from daily_reports r where r.id = daily_report_id and r.company_id = auth_company_id()));

create policy "odometer_same_company" on odometer_captures for all
  using (exists (select 1 from daily_reports r where r.id = daily_report_id and r.company_id = auth_company_id()))
  with check (exists (select 1 from daily_reports r where r.id = daily_report_id and r.company_id = auth_company_id()));
