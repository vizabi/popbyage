import "./styles.scss";
import { 
  BaseComponent,
  TimeSlider,
  DataNotes,
  LocaleService,
  LayoutService,
  TreeMenu,
  SteppedSlider,
  Dialogs,
  ButtonList,
  CapitalVizabiService,
  Repeater,
  Facet,
  versionInfo,
} from "VizabiSharedComponents";
import { VizabiPopByAge } from "./popbyage-cmp.js";
import { Grouping } from "./dialogs/grouping/grouping.js";

export default class PopByAge extends BaseComponent {

  constructor(config){
    const fullMarker = config.model.markers.pyramid;
      
    const frameType = config.Vizabi.stores.encodings.modelTypes.frame;
    const { marker, splashMarker } = frameType.splashMarker(fullMarker);
    config.model.markers.pyramid = marker;

    config.name = "popbyage";

    config.subcomponents = [{
      type: Repeater,
      placeholder: ".vzb-repeater",
      model: marker,
      options: {
        repeatedComponent: Facet, 
        repeatedComponentCssClass: "vzb-facet",
        repeatedComponentOptions: {
          facetedComponent: VizabiPopByAge,
          facetedComponentCssClass: "vzb-popbyage",
          direction: "column"
        }
      },
      name: "chart",
    },{
      type: TimeSlider,
      placeholder: ".vzb-timeslider",
      model: marker,
      name: "time-slider"
    },{
      type: SteppedSlider,
      placeholder: ".vzb-speedslider",
      model: marker,
      name: "speed-slider"
    },{
      type: TreeMenu,
      placeholder: ".vzb-treemenu",
      model: marker,
      name: "tree-menu"
    },{
      type: DataNotes,
      placeholder: ".vzb-datanotes",
      model: marker
    },{
      type: Dialogs,
      placeholder: ".vzb-dialogs",
      model: marker,
      name: "dialogs"
    },{
      type: ButtonList,
      placeholder: ".vzb-buttonlist",
      model: marker,
      name: "buttons"
    }];

    config.template = `
      <div class="vzb-chart">
        <div class="vzb-repeater"></div>
      </div>
      <div class="vzb-animationcontrols">
        <div class="vzb-timeslider"></div>
        <div class="vzb-speedslider"></div>
      </div>
      <div class="vzb-sidebar">
        <div class="vzb-dialogs"></div>
        <div class="vzb-buttonlist"></div>
      </div>
      <div class="vzb-treemenu"></div>
      <div class="vzb-datanotes"></div>
    `;
  
    config.services = {
      Vizabi: new CapitalVizabiService({Vizabi: config.Vizabi}),
      locale: new LocaleService(config.locale),
      layout: new LayoutService({placeholder: config.placeholder})
    };
    
    super(config);
    this.splashMarker = splashMarker;
  }
}
PopByAge.DEFAULT_UI = {
  chart: {
    mode: "smallMultiples",
    opacityHighlightDim: 0.1,
    opacitySelectDim: 0.3,
    opacityRegular: 1,
    stacked: true,
    inpercent: false,
    flipSides: true,
    lockActive: true,
    lockNonSelected: 0
  },
};

PopByAge.versionInfo = { version: __VERSION, build: __BUILD, package: __PACKAGE_JSON_FIELDS, sharedComponents: versionInfo};
