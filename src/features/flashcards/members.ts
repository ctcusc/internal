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
    {
      id: "rachel-he",
      name: "Rachel He",
      photo: "/members/rachelhe.JPG",
    },
    {
      id: "connor-mao",
      name: "Connor Mao",
      photo: "/members/connor-mao.jpeg",
    },
    {
      id: "gautham-gopinath",
      name: "Gautham Gopinath",
      photo: "/members/gautham-gopinath.jpg",
    },
    {
      id: "brennen-ho",
      name: "Brennen Ho",
      photo: "/members/brennen-ho.jpg",
    },
    {
      id: "dale-dai",
      name: "Dale Dai",
      photo: "/members/dale-dai.png",
    },
  ];