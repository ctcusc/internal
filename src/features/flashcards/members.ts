import "server-only";

export type Member = {
  id: string;
  name: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "ctc-13",
    name: "Darren Shen",
    photo: "/darrens-pic.jpg",
  },
];
