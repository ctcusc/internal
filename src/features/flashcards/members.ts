import "server-only";

export type Member = {
  id: string;
  name: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "6506829008",
    name: "Siddharth Yelisetty",
    photo: "/Siddharth_Yelisetty.jpeg",
  },
];
