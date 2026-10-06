import "server-only";

export type Member = {
  id: string;
  name: string;
  photo: string | null;
};

export const members: Member[] = [
  {
    id: "halas-graden",
    name: "Halas Graden",
    photo: "members/profile_headshot.jpg",
  },
];
