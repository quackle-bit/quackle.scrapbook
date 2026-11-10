import { Forward } from "@/components/ui/Forward";

/** Old address (…/scrapbook/scrapbook?id=…): the scrapbook now lives at /book. */
export default function OldScrapbookPage() {
  return <Forward to="/book" />;
}
