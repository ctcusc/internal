import "server-only";

export type Member = {
  id: string;
  name: string;
  year?: string;
  major?: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "kyle-yuen",
    name: "Kyle Yuen",
    year: "Sophomore",
    major: "Computer Science",
    photo: "/members/kyle-yuen.jpg",
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
