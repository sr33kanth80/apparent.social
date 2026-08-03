import "./index.css";
import { Composition } from "remotion";
import { ApparentSiteExplainer, SITE_EXPLAINER_DURATION } from "./SiteExplainer";
import { ApparentFeatureTour, FEATURE_TOUR_DURATION } from "./FeatureTour";
import { ApparentFastInvestor, FAST_INVESTOR_DURATION } from "./FastInvestor";

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
      <Composition
        id="ApparentFeatureTour"
        component={ApparentFeatureTour}
        durationInFrames={FEATURE_TOUR_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ApparentFastInvestor"
        component={ApparentFastInvestor}
        durationInFrames={FAST_INVESTOR_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
