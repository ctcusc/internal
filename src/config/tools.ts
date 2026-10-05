type ToolDetails = {
  id: string;
  name: string;
  description?: string;
  icon: "people";
};

export type Tool = ToolDetails &
  (
    | { status: "available"; href: `/tools/${string}` }
    | { status: "coming-soon"; href?: never }
  );

// Register a tool here when its route is ready. Coming-soon entries deliberately
// have no URL, so the shell never links to an unfinished feature.
export const tools: readonly Tool[] = [
  {
    id: "learn-names",
    name: "Learn member names",
    icon: "people",
    status: "coming-soon",
  },
];
