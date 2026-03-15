import { defineType, defineField } from "sanity";

export default defineType({
  name: "run",
  title: "Run",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "distance",
      title: "Distance (km)",
      type: "number",
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "route",
      title: "Route Name",
      type: "string",
    }),
    defineField({
      name: "meetingPoint",
      title: "Meeting Point",
      type: "string",
    }),
    defineField({
      name: "paceGroups",
      title: "Pace Groups",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "name", title: "Group Name", type: "string" }),
            defineField({ name: "pace", title: "Pace (min/km)", type: "string" }),
          ],
        },
      ],
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
    }),
    defineField({
      name: "image",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "recurring",
      title: "Recurring",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "recurrenceDay",
      title: "Recurrence Day",
      type: "string",
      options: {
        list: [
          "Monday", "Tuesday", "Wednesday", "Thursday",
          "Friday", "Saturday", "Sunday",
        ],
      },
      hidden: ({ parent }) => !parent?.recurring,
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "route",
      media: "image",
    },
  },
});
