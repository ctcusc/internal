import "server-only";

export type Member = {
  id: string;
  name: string;
  year: string;
  major: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "sample-member",
    name: "Member name",
    year: "Year",
    major: "Major",
    photo: null,
  },
  {
    id: "kyle-yuen",
    name: "Kyle Yuen",
    year: "Sophomore",
    major: "Computer Science",
    photo: "/members/kyle-yuen.jpg",
  },
];
