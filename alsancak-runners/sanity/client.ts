import { createClient } from "next-sanity";

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "your-project-id",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: true,
});

// GROQ queries for fetching data
export const queries = {
  // All upcoming runs sorted by date
  upcomingRuns: `*[_type == "run" && date >= now()] | order(date asc) {
    _id, title, slug, date, distance, route, meetingPoint, paceGroups, description,
    "imageUrl": image.asset->url
  }`,

  // All photos with optional category filter
  photos: `*[_type == "photo"] | order(date desc) {
    _id, caption, category, date, photographer, instagramUrl, featured, size,
    "imageUrl": image.asset->url
  }`,

  // Featured photos only
  featuredPhotos: `*[_type == "photo" && featured == true] | order(date desc) {
    _id, caption, category, "imageUrl": image.asset->url
  }`,

  // All collaborations
  collaborations: `*[_type == "collaboration"] | order(order asc) {
    _id, brand, title, slug, subtitle, description, accentColor, date,
    "imageUrl": image.asset->url,
    "galleryUrls": gallery[].asset->url
  }`,

  // Team members
  team: `*[_type == "teamMember"] | order(order asc) {
    _id, name, role, instagram, bio,
    "imageUrl": image.asset->url
  }`,

  // Site settings (singleton)
  siteSettings: `*[_type == "siteSettings"][0] {
    title, tagline, description, instagramHandle,
    stats, manifesto, socialLinks
  }`,
};
