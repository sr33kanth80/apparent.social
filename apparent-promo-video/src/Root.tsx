import "./index.css";
import { Composition } from "remotion";
import { ApparentSiteExplainer, SITE_EXPLAINER_DURATION } from "./SiteExplainer";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ApparentExplainer"
        component={ApparentSiteExplainer}
        durationInFrames={SITE_EXPLAINER_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
