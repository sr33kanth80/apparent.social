import "./index.css";
import { Composition } from "remotion";
import { ApparentPromo } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ApparentPromo"
        component={ApparentPromo}
        durationInFrames={870}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
