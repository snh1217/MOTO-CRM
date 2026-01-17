# MOTO-CRM

오토바이 정비 접수/문의 관리용 CRM입니다. Next.js(App Router) + Supabase + Vercel 환경을 기준으로 구성되어 있습니다.

## 프로젝트 구조

```text
app/
  api/
    admin/
      auth/route.ts
      logout/route.ts
    receipts/route.ts
    receipts/export/route.ts
    inquiries/route.ts
    inquiries/[id]/route.ts
    inquiries/export/route.ts
  admin/
    receipts/page.tsx
    inquiries/page.tsx
    page.tsx
  inquiry/page.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  InquiryForm.tsx
  Nav.tsx
  ReceiptForm.tsx
lib/
  admin.ts
  auth.ts
  supabase.ts
  validation.ts
```

## 로컬 실행

```bash
npm install
npm run dev
```

## 환경 변수

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_CODE=motostar
SESSION_SECRET=...
SUPABASE_VIN_ENGINE_BUCKET=vin-engine
```

## Supabase SQL 스키마

```sql
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  vehicle_name text not null,
  vehicle_number text not null,
  mileage_km integer not null,
  customer_name text not null,
  phone text not null,
  purchase_date date not null,
  vin_image_url text not null,
  engine_image_url text not null,
  symptom text not null,
  service_detail text not null
);

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  phone text not null,
  content text not null,
  contacted boolean not null default false
);
```

## RLS 예시 (선택)

```sql
alter table receipts enable row level security;
alter table inquiries enable row level security;

-- public insert only
create policy "public insert receipts" on receipts
  for insert with check (true);

create policy "public insert inquiries" on inquiries
  for insert with check (true);
```

## Storage 가이드

- 버킷명: `vin-engine` (또는 `SUPABASE_VIN_ENGINE_BUCKET` 값)
- 공개 버킷으로 설정 (public)
- 업로드 경로는 랜덤 UUID 기반으로 저장
- 버킷 정책 예시: `storage.objects` 테이블에서 public 읽기를 허용하거나, 서비스 롤 키로만 쓰기 수행

```sql
-- public 버킷 설정 시 Supabase가 자동으로 공개 읽기를 처리합니다.
-- 서비스 롤 키는 RLS를 우회하므로 API 서버에서 업로드가 가능합니다.
```

## Vercel 배포

1. GitHub 저장소 연결
2. 환경 변수 등록 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ADMIN_CODE, SESSION_SECRET)
3. `npm run build` 후 배포 완료
4. 필요 시 Vercel Project Settings > Security에서 보호된 환경 변수 설정

## CORS/모바일 앱 확장

모바일 앱에서 API를 호출할 경우, 필요한 도메인에 대해 `Access-Control-Allow-Origin` 헤더를 추가하도록 API Route Handler에 확장 가능합니다. 기본적으로 동일 도메인 호출을 가정합니다.
