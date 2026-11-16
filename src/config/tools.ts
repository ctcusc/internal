type ToolDetails = {
  id: string;
  name: string;
  description?: string;
  icon: "people";
};

export type Tool = ToolDetails &
  (
    | { status: "available"; href: `/${string}` }
    | { status: "coming-soon"; href?: never }
  );

// Tool hrefs must not start with /go (public short links) or /api
export const tools: readonly Tool[] = [
  {
    id: "flashcards",
    name: "Flashcards",
    icon: "people",
    status: "available",
    href: "/flashcards",
  },
];
