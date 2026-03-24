# App Improvement Plan (Backend + Frontend)

## Goal
Ship a production-grade running app with stronger trust, retention, and premium UX while keeping scope realistic for a small team.

## Phase 0 (0-3 weeks): Stabilize core trust
- Fix local lint/build toolchain so CI can gate merges.
- Add backend observability baseline: structured logs, request IDs, error-rate dashboards.
- Add API contract tests for auth, activities, community feed, events, and RSVP edge cases.
- Add privacy-safe defaults for activity visibility and map sharing.

## Phase 1 (3-8 weeks): Core retention loop
- Introduce weekly goals + streak model + comeback prompts.
- Upgrade post-run summary cards (progress delta, best split, social CTA).
- Improve feed quality scoring (recency + relationship + quality signals).
- Add challenge MVP (weekly distance + consistency) with anti-spam feed integration.

## Phase 2 (8-14 weeks): Product differentiation
- Build local community layer (clubs, event narratives, shared milestones).
- Add safe route sharing artifacts (blurred start/end, simplified public polyline, map thumbnails).
- Add anomaly checks (impossible speed, teleport jumps, duplicate imports).
- Add notification preference matrix and targeted push campaigns.

## Backend priorities
1. Service modularization from route handlers (auth, activities, feed, events).
2. Queue-based async jobs for feed fanout, notifications, recap generation.
3. Strong idempotency for mobile writes and retry-safe endpoints.
4. Data quality and anti-cheat pipeline.

## Frontend priorities
1. Redesign onboarding and permission UX to improve trust and activation.
2. Live-run and post-run UX polish (clarity, haptics, confidence states).
3. Feed card hierarchy and map-first visual system.
4. Profile progression narrative (milestones, trends, consistency).

## Success metrics
- D1 activation: first tracked run completed.
- D7 retention: user returns and records at least 1 run.
- Weekly active runners.
- Avg runs per active user per week.
- Social actions per run (kudos/comments/follows).
- Event RSVP conversion rate.

## Risks to avoid
- Feature bloat before habit loop quality is solved.
- Weak privacy defaults for route/location data.
- Heavy backend complexity before observability and CI quality gates.

## Detailed onboarding plan (social running app)
### O1. First-open framing (day 0)
- 3-screen narrative:
  1) Track reliably
  2) Run with community
  3) Share safely (privacy-first map controls)
- Explicitly explain visibility levels (private / members / public) before first run.

### O2. Progressive permission flow (day 0)
- Ask in order:
  1) foreground location on "Start run"
  2) notification permission after first successful run save
  3) background location only when user opts into long-run mode
- Never request all permissions in one burst.

### O3. Activation milestones (days 0-3)
- Milestone A: complete first tracked run.
- Milestone B: complete profile basics (name, city, pace group).
- Milestone C: follow 3 people or join 1 club.
- Milestone D: react/comment once in feed.
- Product should show completion progress for these milestones.

### O4. New-user social seeding
- Auto-suggest local runners/clubs based on city + pace band.
- Start feed with mixed content:
  - nearby public activities
  - high-quality community posts
  - one “how to post safely” education card.

## Detailed social system plan
### S1. Feed object model (MVP)
- run_post
- badge_earned
- event_joined
- club_joined
- weekly_recap

Each feed item must include actor, visibility scope, quality score, and anti-spam flags.

### S2. Feed ranking v1
- score = 0.40 * recency + 0.30 * relationship + 0.20 * quality + 0.10 * diversity
- relationship: follow relation + club overlap
- quality: distance significance, split completeness, media/map quality
- diversity: avoid same actor dominating feed

### S3. Anti-spam and quality controls
- collapse low-value duplicate activities from same user in short window.
- dampen posts with very low telemetry quality.
- shadow-rank repetitive “empty” posts (no map, no context, no interaction).

### S4. Club growth loops
- club weekly goals (distance + consistency).
- weekly club recap card (top effort, most consistent, newcomers).
- lightweight club announcements with moderation controls.

## Step-by-step execution plan (12 weeks)
### Weeks 1-2
- Ship onboarding O1 + O2.
- Add onboarding events to analytics.
- Add privacy education surfaces.

### Weeks 3-4
- Ship activation milestones O3 and progress UI.
- Ship runner/club recommendation module for O4.

### Weeks 5-6
- Introduce feed object model S1.
- Implement ranking v1 S2 behind feature flag.

### Weeks 7-8
- Add anti-spam and feed quality controls S3.
- Add telemetry quality gating in feed cards.

### Weeks 9-10
- Launch club loops S4 (weekly goals + recap cards).
- Add push campaigns tied to club activity.

### Weeks 11-12
- Optimize retention loops by cohort.
- Iterate ranking weights and onboarding funnel drop-off points.

## KPI scorecard for onboarding + social
- Activation D1: first run completion rate.
- Activation D3: profile + first social interaction completion.
- D7 retention by onboarding cohort.
- Feed interaction depth (kudos + comments per active user).
- Club join rate and 2-week club retention.
- Safe sharing adoption (members/private ratio vs public).

---

## Implementation tracker (week-by-week, updated)

Bu bölüm, planlanan kapsamı **hafta bazında** ve mevcut implementasyonlarla birlikte özetler.
Amaç, ürünün bireysel kullanıcı kadar **şirket ekipleri** ve **kulüp toplulukları** için de uygun hale gelmesini sağlamaktır.

### Weeks 1-2 — Trust, onboarding framing, permission safety
**Hedef**
- İlk deneyimde güven inşası, permission akışında aşamalı yaklaşım, güvenli paylaşım eğitimi.

**Implemented**
- `POST /api/onboarding/events` ile onboarding olay toplama (allowlist + strict rate limit).
- `GET /api/community/activities` içinde privacy education card (`educationCards`) yüzeyi.
- Event tabanlı olarak onboarding milestone işaretleme altyapısı (`first_run_saved`, vb.).

**Şirket/Kulüp uygunluğu**
- Yeni ekip üyeleri için standart onboarding telemetrisi sağlar.
- Güvenli paylaşım kartı sayesinde kurumsal/organizasyonel topluluklarda yanlış paylaşım riski azalır.

### Weeks 3-4 — Activation milestones and progress visibility
**Hedef**
- O3 milestone’larını görünür yapmak (ilk koşu, profil, sosyal seed, etkileşim).

**Implemented**
- `onboarding_progress` şeması ve migration.
- `GET /api/onboarding/progress` ile completion yüzdesi ve milestone durumu.

**Şirket/Kulüp uygunluğu**
- Ekip/club yöneticileri onboarding drop-off noktalarını daha iyi takip edebilir.

### Weeks 5-6 — Feed object model and ranking v1
**Hedef**
- Feed’i kalite/ilişki/zaman sinyalleriyle sıralamak.

**Implemented**
- `feed_items` şeması + migration altyapısı.
- `GET /api/feed` endpoint’i ile ranking v1:
  - `0.40 recency + 0.30 relationship + 0.20 quality + 0.10 diversity`

**Şirket/Kulüp uygunluğu**
- Organizasyon içi ilişkiler (following / same community behavior) feed kalitesini artırır.
- Koşu kulübü ve şirket challenge gönderileri için temel feed mimarisi hazırdır.

### Weeks 7-8 — Anti-spam and telemetry quality controls
**Hedef**
- Düşük kaliteli veya tekrar eden içeriklerin feed’i bozmasını engellemek.

**Implemented**
- `GET /api/feed` içinde düşük değerli tekrar gönderiler için collapse (anti-spam).
- GPS/telemetry kalitesi düşük postlar için quality-aware scoring bileşeni.

**Şirket/Kulüp uygunluğu**
- Kurumsal kullanımda feed’in “gürültüye boğulmasını” azaltır.
- Kulüp içinde düzenli ve anlamlı içerik akışını destekler.

### Weeks 9-10 — Club growth loops (weekly goals + recap-ready metrics)
**Hedef**
- Kulüp döngülerini haftalık hedeflerle güçlendirmek.

**Implemented**
- `club_weekly_goals` şeması + migration.
- `GET /api/clubs/:id/weekly-goal` ile haftalık ilerleme metrikleri.
- `POST /api/clubs/:id/weekly-goal` ile owner/admin hedef yönetimi (strict RL).

**Şirket/Kulüp uygunluğu**
- Şirket takımları ve kulüpler için haftalık mesafe hedefi yönetimi sağlar.
- Yönetici rolleriyle kontrol edilebilir challenge operasyonu sunar.

### Weeks 11-12 — Cohort optimization and retention tuning
**Hedef**
- Cohort bazlı retention optimizasyonu ve ranking weight iterasyonu.

**Current status**
- Altyapı hazır: onboarding events + progress + feed ranking + weekly goals.
- Bir sonraki adım:
  - cohort dashboard / segmented analytics,
  - ranking weight A/B konfigürasyonu,
  - club/company segmentlerine özel nudges.

---

## Company & Clubs readiness checklist

### ✅ Mevcut
- Güvenli auth/recovery akışları ve strict rate limiting.
- Kulüp modeli (create/join/weekly goal) ve onboarding progress altyapısı.
- Privacy-safe paylaşım varsayılanları ve toplulukta konum obfuscation.
- Feed ranking + anti-spam temel mekanikleri.

### ⏭ Sıradaki kritik tamamlayıcılar
- Multi-tenant / organization boundary policy (şirket bazlı ayrışma).
- Role matrix genişletme (company admin, team lead, club moderator).
- Kurumsal raporlama/export ve yönetici dashboard’ları.
- Moderation queue ve incident audit trail.
