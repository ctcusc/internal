import "server-only";

export type Member = {
  id: string;
  name: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "kyle-yuen",
    name: "Kyle Yuen",
    photo: "/members/kyle-yuen.jpg",
  },
  {
    id: "connor-mao",
    name: "Connor Mao",
    photo: "/members/connor-mao.jpeg",
  },
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
