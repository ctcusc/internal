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
    photo: "/PHOTO.jpg",
  },
];
