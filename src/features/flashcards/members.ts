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
    id: "6506829008",
    name: "Siddharth Yelisetty",
    year: "Freshman",
    major: "Computer Science",
    photo: "/Siddharth_Yelisetty.jpeg",
  },
];
