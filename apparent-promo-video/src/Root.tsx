import "./index.css";
import { Composition } from "remotion";
import { ApparentPromo } from "./Composition";
import { ApparentExplainer, EXPLAINER_DURATION } from "./Explainer";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ApparentExplainer"
        component={ApparentExplainer}
        durationInFrames={EXPLAINER_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
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
