import { defineType, defineField } from "sanity";

export default defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Site Title",
      type: "string",
      initialValue: "ALSANCAK RUNNERS",
    }),
    defineField({
      name: "tagline",
      title: "Tagline",
      type: "string",
      initialValue: "Run The City",
    }),
    defineField({
      name: "description",
      title: "Site Description",
      type: "text",
    }),
    defineField({
      name: "instagramHandle",
      title: "Instagram Handle",
      type: "string",
      initialValue: "@alsancakrunners",
    }),
    defineField({
      name: "stats",
      title: "Community Stats",
      type: "object",
      fields: [
        defineField({ name: "totalRuns", title: "Total Runs", type: "number" }),
        defineField({ name: "activeMembers", title: "Active Members", type: "number" }),
        defineField({ name: "totalKm", title: "Total KM", type: "number" }),
      ],
    }),
    defineField({
      name: "manifesto",
      title: "Manifesto Lines",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "socialLinks",
      title: "Social Links",
      type: "object",
      fields: [
        defineField({ name: "instagram", title: "Instagram URL", type: "url" }),
        defineField({ name: "strava", title: "Strava URL", type: "url" }),
        defineField({ name: "twitter", title: "X (Twitter) URL", type: "url" }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({
      title: "Site Settings",
    }),
  },
});
