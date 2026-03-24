import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, activities, posts, kudos, comments, follows, postKudos, postComments } from "@/db/schema";
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
  "Bugün harika bir sabah koşusu oldu! ☀️",
  "Yeni PB kırdım, çok mutluyum 🎉",
  "Yağmurda koşmak ayrı keyif 🌧️",
  "Kordon'da gün batımı eşliğinde 5K 🌅",
  "Haftanın son koşusu, yorgunum ama mutlu",
  "İlk 10K'mı tamamladım! 💪",
  "Tempo antrenmanı — bacaklarım titriyor",
  "Sabah 6'da Kordon bomboştu, mükemmeldi",
  "Koşu grubuyla birlikte 8K yaptık 🏃‍♂️🏃‍♀️",
  "Kültürpark'ta sonbahar renkleri harika",
  "Bugün biraz yavaş koştum ama olsun, tutarlılık önemli",
  "Sahilyolu'nda rüzgar vardı ama vazgeçmedim 💨",
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

  // Running/nature photos from Unsplash (free, no auth needed for small sizes)
  const PHOTO_URLS = [
    "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80", // runner sunset
    "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=600&q=80", // running shoes trail
    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80", // runner road
    "https://images.unsplash.com/photo-1486218119243-13883505764c?w=600&q=80", // runner silhouette
    "https://images.unsplash.com/photo-1594882645126-14020914d58d?w=600&q=80", // coastal run
    "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80", // morning jog
    "https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=600&q=80", // park running
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80", // athlete stretching
  ];

  // Create posts for some members (with photos!)
  let postCount = 0;
  const postIds: string[] = [];
  for (let i = 0; i < Math.min(10, memberIds.length); i++) {
    const text = POST_TEXTS[Math.floor(Math.random() * POST_TEXTS.length)];
    const hasPhoto = Math.random() > 0.3; // 70% chance of photo
    try {
      const [created] = await db.insert(posts).values({
        memberId: memberIds[i],
        text,
        photoUrl: hasPhoto ? PHOTO_URLS[Math.floor(Math.random() * PHOTO_URLS.length)] : null,
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
