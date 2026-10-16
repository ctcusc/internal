import "server-only";

export type Member = {
  id: string;
  name: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "halas-graden",
    name: "Halas Graden",
    photo: "/members/halas-graden.webp",
  },
  {
    id: "shin-masada",
    name: "Shin Masada",
    photo: "/members/shin-masada.webp",
  },
  {
    id: "ruina-liu",
    name: "Ruina Liu",
    photo: "/members/ruina-liu.webp",
  },
  {
    id: "kyle-yuen",
    name: "Kyle Yuen",
    photo: "/members/kyle-yuen.webp",
  },
  {
    id: "Christopher-Tutor",
    name: "Christopher Tutor",
    photo: "/members/christopher-tutor.webp",
  },
  {
    id: "joshua-zhang",
    name: "Joshua Zhang",
    photo: "/members/joshua-zhang.webp",
  },
  {
    id: "6506829008",
    name: "Siddharth Yelisetty",
    photo: "/members/siddharth-yelisetty.webp",
  },
  {
    id: "rachel-he",
    name: "Rachel He",
    photo: "/members/rachel-he.webp",
  },
  {
    id: "connor-mao",
    name: "Connor Mao",
    photo: "/members/connor-mao.webp",
  },
  {
    id: "gautham-gopinath",
    name: "Gautham Gopinath",
    photo: "/members/gautham-gopinath.webp",
  },
  {
    id: "brennen-ho",
    name: "Brennen Ho",
    photo: "/members/brennen-ho.webp",
  },
  {
    id: "rohan-george",
    name: "Rohan George",
    photo: "/members/rohan-george.webp",
  },
  {
    id: "dale-dai",
    name: "Dale Dai",
    photo: "/members/dale-dai.webp",
  },
  {
    id: "darren-shen",
    name: "Darren Shen",
    photo: "/members/darren-shen.webp",
  },
  {
    id: "marcus-cao",
    name: "Marcus Cao",
    photo: "/members/marcus-cao.webp",
  },
  {
    id: "micah-muir",
    name: "Micah Muir",
    photo: "/members/micah-muir.webp",
  },
];
