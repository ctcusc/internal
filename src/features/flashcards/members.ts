import "server-only";

export type Member = {
  id: string;
  name: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "gautham-gopinath",
    name: "Gautham Gopinath",
    photo: "/members/gautham-gopinath.jpg",
  },
  {
    id: "brennen-ho",
    name: "Brennen Ho",
    photo: "/members/brennen-ho.jpg",
  },
];
