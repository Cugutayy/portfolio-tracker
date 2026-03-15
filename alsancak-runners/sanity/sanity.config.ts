import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemas";

export default defineConfig({
  name: "alsancak-runners",
  title: "Alsancak Runners",

  // Replace with your actual Sanity project ID and dataset
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "your-project-id",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",

  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
});
