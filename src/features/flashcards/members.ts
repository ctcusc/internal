import "server-only";

export type Member = {
  id: string;
  name: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "darren-shen",
    name: "Darren Shen",
    photo: "/members/darren-shen.jpg",
  },
];
