import "server-only";

export type Member = {
  id: string;
  name: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "sample-member",
    name: "Member name",
    photo: null,
  },
];
