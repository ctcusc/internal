import "server-only";
import ruinaPhoto from "./ruina-photo.png";

export type Member = {
  id: string;
  name: string;
  photo: string | null;
};

export const members: readonly Member[] = [
  {
    id: "ruina-liu",
    name: "Ruina Liu",
    photo: ruinaPhoto,
  },
];
