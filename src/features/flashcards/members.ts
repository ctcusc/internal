import "server-only";

export type Member = {
  id: string;
  name: string;
};

export const members: readonly Member[] = [
  {
    id: "sample-member",
    name: "Member name",
  },
];
