import "server-only";

export type Member = {
  id: string;
  name: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "connor-mao",
    name: "Connor Mao",
    photo: "/members/connor-mao.jpeg",
  },
];
