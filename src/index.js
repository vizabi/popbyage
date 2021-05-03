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
  ButtonList
} from "VizabiSharedComponents";
import { VizabiPopByAge } from "./component";
import { observable } from "mobx";

const VERSION_INFO = { version: __VERSION, build: __BUILD };

export default class PopByAge extends BaseComponent {

  constructor(config){
    const marker = config.model.markers.popbyage;

    config.name = "popbyage";

    config.subcomponents = [{
      type: VizabiPopByAge,
      placeholder: ".vzb-popbyage",
      model: marker,
      name: "chart"
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
      <div class="vzb-popbyage"></div>
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
      locale: new LocaleService(config.locale),
      layout: new LayoutService({placeholder: config.placeholder})
    };

    //register locale service in the marker model
    config.model.config.markers.popbyage.data.locale = observable({
      get id() { return config.services.locale.id; }
    });
    
    super(config);
  }
}

// PopByAge.DEFAULT_UI = {
//   chart: {}
// }


  // validate(model) {
  //   model = this.model || model;

  //   this._super(model);

  //   //validate on first model set only
  //   if (!this.model) {
  //     const entities_geodomain = model.state.entities_geodomain;
  //     entities_geodomain.skipFilter = (model.state.entities.dim === entities_geodomain.dim || model.state.entities_side.dim === entities_geodomain.dim) && 
  //       (Boolean(model.state.entities.getFilteredEntities().length) || !model.state.entities_side.skipFilter);
  //   }
  // }
PopByAge.DEFAULT_UI = {
  chart: {
    opacityHighlightDim: 0.1,
    opacitySelectDim: 0.3,
    opacityRegular: 1,
    stacked: true,
    inpercent: false,
    flipSides: true,
    lockActive: true,
    lockNonSelected: 0
  },
}

PopByAge.default_model = {
  state: {
  },
  ui: {
    chart: {
      mode: "smallMultiples",
      stacked: true,
      inpercent: false,
      flipSides: true,
      lockActive: true,
      lockNonSelected: 0
    },
    "buttons": ["colors", "find", "lock", /*"side",*/ "inpercent", "moreoptions", "sidebarcollapse", "fullscreen"],
    "dialogs": {
      "popup": ["timedisplay", "colors", "find", /*"side",*/ "moreoptions"],
      "sidebar": ["timedisplay", "colors", "find", "grouping"],
      "moreoptions": ["opacity", "speed", "grouping", "colors", /*"side",*/ "presentation", "about"],
      "dialog": {"find": {"panelMode": "show"}}
    },
    presentation: false
  },
  locale: { }
}

PopByAge.versionInfo = VERSION_INFO
