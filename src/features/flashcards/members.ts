import "server-only";

export type Member = {
  id: string;
  name: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "Christopher-Tutor",
    name: "Christopher Tutor",
    photo: "/members/Chris_Tutor_Photo.jpg",
  },
];
