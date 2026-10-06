import "server-only";

export type Member = {
  id: string;
  name: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "shin-masada",
    name: "Shin Masada",
    photo: "/members/shin-masada.png",
  },
];
