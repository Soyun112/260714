# 로또 추첨기

추첨 번호는 브라우저에서 만든 뒤 `/api/draws` Vercel Serverless Function을 거쳐 Supabase에 저장됩니다. Supabase의 비밀 키는 클라이언트 코드에 포함되지 않습니다.

## 1. Supabase 테이블 만들기

Supabase 프로젝트의 **SQL Editor**에서 [supabase/schema.sql](supabase/schema.sql)을 실행합니다. 기본 테이블 이름은 `lotto_draws`이며, 번호는 `result` JSONB 열에 아래 형태로 저장됩니다.

```json
{ "numbers": [3, 11, 18, 24, 35, 41], "bonus": 7 }
```

## 2. Vercel 환경변수 설정

Vercel 프로젝트의 **Settings → Environment Variables**에 다음 값을 추가합니다. Production, Preview, Development에 필요한 범위로 모두 적용하세요.

| 이름 | 값 |
| --- | --- |
| `SUPABASE_URL` | Supabase Project Settings → API의 Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 같은 화면의 `service_role` 키 |
| `SUPABASE_TABLE` | 선택 사항. 기본값은 `lotto_draws` |

`SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회하는 서버 전용 키입니다. `index.html`이나 `VITE_`, `NEXT_PUBLIC_` 같은 공개 환경변수에 넣지 마세요.

## 3. 배포

저장소를 Vercel에 연결해 배포하면 `api/draws.js`가 `/api/draws`로 제공됩니다. 배포 후 추첨 버튼을 누르고 Supabase의 Table Editor에서 새 행이 생성되는지 확인하세요.

로컬에서 Vercel CLI를 쓸 경우에는 `.env.local`에 동일한 환경변수를 넣고 `vercel dev`로 실행할 수 있습니다. `.env.local`은 Git에 포함되지 않습니다.
