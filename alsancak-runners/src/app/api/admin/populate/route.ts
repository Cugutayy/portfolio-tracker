import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, activities, posts, kudos, comments, follows, postKudos, postComments, groups, groupMembers, events, eventRsvps } from "@/db/schema";
import { eq, sql, like } from "drizzle-orm";
import bcrypt from "bcryptjs";

const AVATAR_BASE = "https://i.pravatar.cc/200?u=";

const DEMO_USERS = [
  { name: "Deniz Yılmaz", bio: "Sabah koşucusu | Kordon aşığı", paceGroup: "5:00-5:30", gender: "f" },
  { name: "Berk Özdemir", bio: "Ultra maratoncu | İzmir Trails", paceGroup: "5:30-6:00", gender: "m" },
  { name: "Selin Arslan", bio: "Yeni başladım, hedef 10K", paceGroup: "6:30-7:00", gender: "f" },
  { name: "Mert Kaya", bio: "Triatlet | Karşıyaka Spor", paceGroup: "5:00-5:30", gender: "m" },
  { name: "Elif Çelik", bio: "Haftada 3 koşu, yoga + koşu", paceGroup: "6:00-6:30", gender: "f" },
  { name: "Ozan Demir", bio: "Tempo koşuları seven biri", paceGroup: "5:30-6:00", gender: "m" },
  { name: "Zeynep Şahin", bio: "Akşam koşucusu 🌙", paceGroup: "6:00-6:30", gender: "f" },
  { name: "Kaan Aydın", bio: "Marathon PB: 3:42", paceGroup: "5:00-5:30", gender: "m" },
  { name: "İrem Güneş", bio: "Koşarak keşfet", paceGroup: "5:30-6:00", gender: "f" },
  { name: "Arda Tunç", bio: "Sabah 6'da Kordon", paceGroup: "5:00-5:30", gender: "m" },
  { name: "Melis Yıldırım", bio: "İzmir half marathon finisher", paceGroup: "5:30-6:00", gender: "f" },
  { name: "Burak Koç", bio: "Trail running ❤️", paceGroup: "6:00-6:30", gender: "m" },
  { name: "Ceren Aksoy", bio: "5K → 10K → 21K yolculuğu", paceGroup: "6:30-7:00", gender: "f" },
  { name: "Tolga Erdem", bio: "Hız işi değil keyif işi", paceGroup: "7:00+", gender: "m" },
  { name: "Nazlı Kurt", bio: "Bornova parkta her sabah", paceGroup: "6:00-6:30", gender: "f" },
];

const RUN_TITLES = [
  "Kordon Sabah Koşusu", "Sahilyolu Tempolu", "Kültürpark 5K",
  "Bornova Park Turu", "Göztepe Sahil Koşusu", "Karşıyaka İskelesi",
  "Alsancak Akşam Koşusu", "İnciraltı Uzun Koşu", "Bayraklı Sahil",
  "Balçova Teleferik Yolu", "Konak Meydanı → Kordon", "Güzelyalı Sahil",
  "Mavişehir Parkur", "Çeşme Yolu Antrenman", "Buca Gölet Çevresi",
];

const POST_TEXTS = [
  "Bugün harika bir sabah koşusu oldu! Kordon'da deniz mis gibi kokuyordu ☀️",
  "Yeni 5K PB! 23:42 🎉 Geçen aya göre 45 saniye iyileştirdim",
  "Yağmurda koşmak ayrı bir meditasyon, sesi duyunca adımlarım hızlanıyor 🌧️",
  "Gün batımında Kordon... Bu şehirde koşucu olmak ayrıcalık 🌅",
  "Haftanın 4. koşusu bitti! Bacaklar yorgun ama kafa rahat 🧠",
  "İlk yarı maratonum için antrenman başladı! 12 haftalık plan hazır 📋",
  "Tempo antrenmanı: 4x1km, arada 400m yürüyüş. Bitirince ölmüş gibi hissettim ama değdi 🔥",
  "Sabah 06:00 — Kordon tamamen bana aitti. Kuşlar, deniz, sessizlik...",
  "Bugün 15 kişilik grupla koştuk! Enerji bambaşka oluyor birlikte 🏃‍♂️🏃‍♀️",
  "Kültürpark'ta ağaçların arasında koşmak şehrin gürültüsünü unutturuyor 🌳",
  "Yavaş koştum ama 8 km kestim. Mesafe kazanmak > hız kazanmak",
  "Sahilyolu'nda kuzey rüzgarı vardı, geri dönüşte kuyruk rüzgarı oldu mis 💨",
  "3 aydır her hafta en az 3 koşu yapıyorum. Streak devam ediyor! 🔥",
  "Bu sabah Karşıyaka'da yeni bir rota keşfettim. Sahil boyunca dümdüz 6km",
  "Koşudan sonra kahvaltı — en güzel ödül bu 🥐☕",
  "İzmir Maratonu'na 8 hafta kaldı. Hazırlıklar tam gaz!",
  "Akşam koşusu bitti, şimdi sıra stretching'de. Recovery da antrenmanın parçası 🧘",
  "Bugün ilk defa 10km'yi 50 dakikanın altında koştum!! Çok gururluyum 🥇",
  "Bornova'da tepeli bir rota denedim. Elevation gain 120m — bacaklarım ağlıyor 😅",
  "Her koşu sonrası bu manzaraya bakıyorum ve neden koştuğumu hatırlıyorum 🌊",
];

// 20 unique running/nature photos — no duplicates
const PHOTO_URLS = [
  "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80",
  "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=600&q=80",
  "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80",
  "https://images.unsplash.com/photo-1486218119243-13883505764c?w=600&q=80",
  "https://images.unsplash.com/photo-1594882645126-14020914d58d?w=600&q=80",
  "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80",
  "https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=600&q=80",
  "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80",
  "https://images.unsplash.com/photo-1502904550040-7534597429ae?w=600&q=80",
  "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=600&q=80",
  "https://images.unsplash.com/photo-1544899489-a083461b088c?w=600&q=80",
  "https://images.unsplash.com/photo-1539795124004-78ec5a67d1c0?w=600&q=80",
  "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80",
  "https://images.unsplash.com/photo-1483721310020-03333e577078?w=600&q=80",
  "https://images.unsplash.com/photo-1580058572462-98e2c0e0e2f0?w=600&q=80",
  "https://images.unsplash.com/photo-1604480132736-44c188fe4d20?w=600&q=80",
  "https://images.unsplash.com/photo-1590333748338-d629e4564ad9?w=600&q=80",
  "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80",
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80",
  "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&q=80",
];

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("x-seed-secret");
  if (authHeader !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash("demo1234", 12);
  const created: string[] = [];
  const memberIds: string[] = [];

  // Create members with avatars
  for (let i = 0; i < DEMO_USERS.length; i++) {
    const u = DEMO_USERS[i];
    const email = `${u.name.toLowerCase().replace(/\s+/g, ".").replace(/[İıÖöÜüÇçŞşĞğ]/g, c => {
      const map: Record<string, string> = { "İ": "i", "ı": "i", "Ö": "o", "ö": "o", "Ü": "u", "ü": "u", "Ç": "c", "ç": "c", "Ş": "s", "ş": "s", "Ğ": "g", "ğ": "g" };
      return map[c] || c;
    })}@demo.rota.run`;

    const [existing] = await db.select({ id: members.id }).from(members).where(eq(members.email, email)).limit(1);
    if (existing) {
      memberIds.push(existing.id);
      // Update avatar if missing
      await db.update(members).set({
        image: `${AVATAR_BASE}${email}`,
        bio: u.bio,
      }).where(eq(members.id, existing.id));
      created.push(`${u.name} (updated)`);
      continue;
    }

    const [member] = await db.insert(members).values({
      name: u.name,
      email,
      passwordHash,
      paceGroup: u.paceGroup,
      role: "member",
      privacy: "public",
      onboardingDone: true,
      image: `${AVATAR_BASE}${email}`,
      bio: u.bio,
    }).returning({ id: members.id });

    memberIds.push(member.id);
    created.push(`${u.name} (created)`);
  }

  // Also update existing demo members with avatars
  const existingDemos = await db.select({ id: members.id, email: members.email, name: members.name })
    .from(members)
    .where(eq(members.privacy, "public"));

  for (const m of existingDemos) {
    if (!m.email.includes("@demo")) continue;
    await db.update(members).set({
      image: `${AVATAR_BASE}${m.email}`,
    }).where(eq(members.id, m.id));
  }

  // Create activities for each member
  const now = Date.now();
  let actCount = 0;

  for (let i = 0; i < memberIds.length; i++) {
    const runsCount = 2 + Math.floor(Math.random() * 4); // 2-5 runs each
    for (let j = 0; j < runsCount; j++) {
      const hoursAgo = Math.floor(Math.random() * 168); // within last week
      const distanceM = 2500 + Math.floor(Math.random() * 8500); // 2.5-11 km
      const paceSecKm = 270 + Math.floor(Math.random() * 180); // 4:30-7:30/km
      const movingTimeSec = Math.round((distanceM / 1000) * paceSecKm);
      const elevationGainM = Math.floor(Math.random() * 50);

      // İzmir coordinates (slight random offset around Kordon area)
      const baseLat = 38.4237 + (Math.random() - 0.5) * 0.02;
      const baseLng = 27.1289 + (Math.random() - 0.5) * 0.02;

      try {
        await db.insert(activities).values({
          memberId: memberIds[i],
          title: RUN_TITLES[Math.floor(Math.random() * RUN_TITLES.length)],
          activityType: "Run",
          startTime: new Date(now - hoursAgo * 3600_000),
          distanceM,
          movingTimeSec,
          elapsedTimeSec: movingTimeSec + Math.floor(Math.random() * 120),
          elevationGainM,
          avgPaceSecKm: paceSecKm,
          startLat: baseLat,
          startLng: baseLng,
          endLat: baseLat + (Math.random() - 0.5) * 0.01,
          endLng: baseLng + (Math.random() - 0.5) * 0.01,
          startLocation: ["Kordon", "Alsancak", "Karşıyaka", "Bornova", "Göztepe", "Buca"][Math.floor(Math.random() * 6)],
          privacy: "public",
          sharedToBoard: true,
          source: "manual",
        });
        actCount++;
      } catch { /* skip duplicates */ }
    }
  }

  // Create posts — each gets a UNIQUE photo and text (no duplicates)
  let postCount = 0;
  const postIds: string[] = [];
  const usedPhotoIndices = new Set<number>();
  const usedTextIndices = new Set<number>();
  for (let i = 0; i < Math.min(15, memberIds.length); i++) {
    // Pick unique text
    let textIdx: number;
    do { textIdx = Math.floor(Math.random() * POST_TEXTS.length); } while (usedTextIndices.has(textIdx) && usedTextIndices.size < POST_TEXTS.length);
    usedTextIndices.add(textIdx);
    const text = POST_TEXTS[textIdx];

    // Pick unique photo (80% chance)
    const hasPhoto = Math.random() > 0.2;
    let photoUrl: string | null = null;
    if (hasPhoto) {
      let pIdx: number;
      do { pIdx = Math.floor(Math.random() * PHOTO_URLS.length); } while (usedPhotoIndices.has(pIdx) && usedPhotoIndices.size < PHOTO_URLS.length);
      usedPhotoIndices.add(pIdx);
      photoUrl = PHOTO_URLS[pIdx];
    }
    try {
      const [created] = await db.insert(posts).values({
        memberId: memberIds[i],
        text,
        photoUrl,
      }).returning({ id: posts.id });
      postIds.push(created.id);
      postCount++;
    } catch { /* skip */ }
  }

  // Add kudos to posts
  let postKudosCount = 0;
  for (const pid of postIds) {
    const kudosGivers = memberIds.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 5));
    for (const mid of kudosGivers) {
      try {
        await db.insert(postKudos).values({ postId: pid, memberId: mid }).onConflictDoNothing();
        postKudosCount++;
      } catch { /* skip */ }
    }
  }

  // Add comments to posts
  const POST_COMMENT_TEXTS = [
    "Cok guzel! 🔥", "Harika paylasim!", "Ben de oradaydim!",
    "Mukemmel manzara 😍", "Ilham verici!", "Bravo 👏",
    "Bir dahakine beraber!", "Bu rota cok guzel",
  ];
  let postCommentCount = 0;
  for (const pid of postIds.slice(0, 6)) {
    const numC = 1 + Math.floor(Math.random() * 3);
    for (let c = 0; c < numC; c++) {
      const commenter = memberIds[Math.floor(Math.random() * memberIds.length)];
      try {
        await db.insert(postComments).values({
          postId: pid,
          memberId: commenter,
          text: POST_COMMENT_TEXTS[Math.floor(Math.random() * POST_COMMENT_TEXTS.length)],
        });
        postCommentCount++;
      } catch { /* skip */ }
    }
  }

  // Add cross-kudos between members (each member kudos 3-6 random activities)
  let kudosCount = 0;
  const allActivities = await db.select({ id: activities.id, memberId: activities.memberId })
    .from(activities)
    .where(sql`${activities.memberId} IN (${sql.join(memberIds.map(id => sql`${id}`), sql`, `)})`)
    .limit(200);

  for (const mid of memberIds) {
    const othersActivities = allActivities.filter(a => a.memberId !== mid);
    const toKudos = othersActivities.sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 4));
    for (const act of toKudos) {
      try {
        await db.insert(kudos).values({ activityId: act.id, memberId: mid }).onConflictDoNothing();
        kudosCount++;
      } catch { /* unique constraint */ }
    }
  }

  // Add realistic comments on activities
  const COMMENT_TEXTS = [
    "Harika tempo! 💪", "Helal olsun!", "Ben de gelmek isterdim 🏃",
    "Muhteşem rota 🌅", "Çok iyi koşmuşsun!", "Kordon'da hava nasıldı?",
    "Birlikte koşalım bir gün!", "Bu pace çok iyi 🔥", "Aferin!",
    "Beni de çağır bir dahakine", "Sabah koşusu en iyisi ☀️", "PB mi bu?",
    "Fena değil!", "İzmir'in en güzel rotası", "Haftaya ben de geliyorum",
  ];
  let commentCount = 0;
  for (const act of allActivities.slice(0, 30)) {
    const numComments = Math.floor(Math.random() * 3); // 0-2 comments per activity
    for (let c = 0; c < numComments; c++) {
      const commenter = memberIds[Math.floor(Math.random() * memberIds.length)];
      if (commenter === act.memberId) continue;
      try {
        await db.insert(comments).values({
          activityId: act.id,
          memberId: commenter,
          text: COMMENT_TEXTS[Math.floor(Math.random() * COMMENT_TEXTS.length)],
        });
        commentCount++;
      } catch { /* skip */ }
    }
  }

  // Add follows between members (each follows 4-8 others)
  let followCount = 0;
  for (const mid of memberIds) {
    const toFollow = memberIds.filter(id => id !== mid).sort(() => Math.random() - 0.5).slice(0, 4 + Math.floor(Math.random() * 5));
    for (const fid of toFollow) {
      try {
        await db.insert(follows).values({ followerId: mid, followingId: fid }).onConflictDoNothing();
        followCount++;
      } catch { /* skip */ }
    }
  }

  // ── Groups ──
  const GROUP_DATA = [
    { name: "Kordon Koşucuları", desc: "Her sabah 06:30'da Kordon'da buluşuyoruz. Tüm seviyeler hoş gelir!", city: "İzmir" },
    { name: "İzmir Trail Runners", desc: "Doğa koşusu severler topluluğu. Hafta sonu trail koşuları.", city: "İzmir" },
    { name: "Karşıyaka Tempo", desc: "Hız antrenmanı ve interval çalışmaları. Hedef: maraton hazırlığı.", city: "İzmir" },
    { name: "Yeni Başlayanlar 5K", desc: "Sıfırdan 5K programı. Birlikte başlıyoruz, birlikte bitiriyoruz 💪", city: "İzmir" },
  ];
  let groupCount = 0;
  const groupIds: string[] = [];
  for (let i = 0; i < GROUP_DATA.length; i++) {
    const g = GROUP_DATA[i];
    const slug = g.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40);
    try {
      const [existing] = await db.select({ id: groups.id }).from(groups).where(eq(groups.slug, slug)).limit(1);
      if (existing) { groupIds.push(existing.id); groupCount++; continue; }
      const [created] = await db.insert(groups).values({
        name: g.name,
        slug,
        description: g.desc,
        city: g.city,
        createdBy: memberIds[i % memberIds.length],
        image: PHOTO_URLS[(i * 3) % PHOTO_URLS.length],
      }).returning({ id: groups.id });
      groupIds.push(created.id);
      groupCount++;
    } catch { /* skip */ }
  }
  // Add members to groups
  let gmCount = 0;
  for (const gid of groupIds) {
    const membersToAdd = memberIds.sort(() => Math.random() - 0.5).slice(0, 5 + Math.floor(Math.random() * 8));
    for (const mid of membersToAdd) {
      try {
        await db.insert(groupMembers).values({ groupId: gid, memberId: mid, role: "member" }).onConflictDoNothing();
        gmCount++;
      } catch { /* skip */ }
    }
  }

  // ── Events ──
  const EVENT_DATA = [
    { title: "Pazar Sabahı Kordon 10K", desc: "Herkes davetli! Kordon başından sona 10K koşu.", type: "group_run", point: "Kordon Başı, Alsancak", dist: 10000 },
    { title: "Kültürpark Tempo Çalışması", desc: "4x1km interval. Arada 2dk dinlenme. Orta-ileri seviye.", type: "tempo_run", point: "Kültürpark Ana Giriş", dist: 6000 },
    { title: "Yeni Başlayanlar Hoşgeldin Koşusu", desc: "İlk kez koşacaklar için rahat tempolu 3K.", type: "group_run", point: "Kordon, Cumhuriyet Meydanı", dist: 3000 },
    { title: "Sahilyolu Uzun Koşu", desc: "Alsancak → Karşıyaka sahil yolu boyunca 15K uzun koşu.", type: "long_run", point: "Alsancak İskele", dist: 15000 },
    { title: "Trail Run: Narlıdere Tepeleri", desc: "Doğa koşusu! Orta zorlukta arazi + yükseklik.", type: "trail_run", point: "Narlıdere Belediye Parkı", dist: 8000 },
    { title: "Akşam Recovery Jog", desc: "Yavaş tempolu recovery koşusu. Herkese açık.", type: "recovery_run", point: "Göztepe Sahil Parkı", dist: 4000 },
  ];
  let eventCount = 0;
  for (let i = 0; i < EVENT_DATA.length; i++) {
    const e = EVENT_DATA[i];
    const daysFromNow = 1 + Math.floor(Math.random() * 14);
    const hour = 6 + Math.floor(Math.random() * 12);
    const date = new Date(Date.now() + daysFromNow * 86400_000);
    date.setHours(hour, 0, 0, 0);
    const slug = e.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 50) + "-" + Math.random().toString(36).slice(2, 6);
    try {
      const [created] = await db.insert(events).values({
        title: e.title,
        slug,
        description: e.desc,
        eventType: e.type,
        date,
        meetingPoint: e.point,
        distanceM: e.dist,
        maxParticipants: 20 + Math.floor(Math.random() * 30),
        createdBy: memberIds[i % memberIds.length],
        groupId: groupIds.length > 0 ? groupIds[i % groupIds.length] : null,
        status: "upcoming",
      }).returning({ id: events.id, slug: events.slug });
      eventCount++;
      // Add random RSVPs
      const rsvpMembers = memberIds.sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 8));
      for (const mid of rsvpMembers) {
        try {
          await db.insert(eventRsvps).values({ eventId: created.id, memberId: mid, status: "going" }).onConflictDoNothing();
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  return NextResponse.json({
    success: true,
    members: created,
    activities: actCount,
    posts: postCount,
    postKudos: postKudosCount,
    postComments: postCommentCount,
    kudos: kudosCount,
    comments: commentCount,
    follows: followCount,
    groups: groupCount,
    groupMembers: gmCount,
    events: eventCount,
  });
}

// DELETE — Clean old demo data
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get("x-seed-secret");
  if (authHeader !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete old @demo.alsancak.run members (cascades to activities, kudos, comments)
  const deleted = await db.delete(members)
    .where(like(members.email, "%@demo.alsancak.run"))
    .returning({ id: members.id, name: members.name });

  return NextResponse.json({
    success: true,
    deleted: deleted.map(d => d.name),
    count: deleted.length,
  });
}
