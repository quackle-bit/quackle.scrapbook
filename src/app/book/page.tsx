import type { Metadata } from "next";
import { BookViewer } from "@/components/book/BookViewer";
import "@/styles/scrapbook.css";
import "@/styles/route.css";
import "@/styles/book.css";
import "@/styles/pitch.css";

export const metadata: Metadata = {
  title: "My Book · quackle.scrapbook",
  description: "Your scrapbook of game ideas.",
};

export default function BookPage() {
  return <BookViewer />;
}
