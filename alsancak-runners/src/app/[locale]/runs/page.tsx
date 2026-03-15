import { redirect } from "next/navigation";

// Old /runs page redirects to the new Turkish events page
export default function RunsPage() {
  redirect("/etkinlikler");
}
