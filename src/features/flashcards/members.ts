import "server-only";

export type Member = {
  id: string;
  name: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "joshua-zhang",
    name: "Joshua Zhang",
    photo: "/members/joshua.jpeg",
  },
];
