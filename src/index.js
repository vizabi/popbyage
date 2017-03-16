import "./styles.scss";
import component from "./component";


//BAR CHART TOOL
const AgePyramid = Vizabi.Tool.extend("AgePyramid", {

  /**
   * Initializes the tool (Bar Chart Tool).
   * Executed once before any template is rendered.
   * @param {Object} placeholder Placeholder element for the tool
   * @param {Object} external_model Model as given by the external page
   */
  init(placeholder, external_model) {

    this.name = "agepyramid";

    //specifying components
    this.components = [{
      component,
      placeholder: ".vzb-tool-viz",
      model: ["state.time", "state.marker", "state.entities", "state.entities_side", "locale", "ui"] //pass models to component
    }, {
      component: Vizabi.Component.get("timeslider"),
      placeholder: ".vzb-tool-timeslider",
      model: ["state.time", "state.entities", "state.marker", "ui"]
    }, {
      component: Vizabi.Component.get("dialogs"),
      placeholder: ".vzb-tool-dialogs",
      model: ["state", "ui", "locale"]
    }, {
      component: Vizabi.Component.get("buttonlist"),
      placeholder: ".vzb-tool-buttonlist",
      model: ["state", "ui", "locale"]
    }, {
      component: Vizabi.Component.get("treemenu"),
      placeholder: ".vzb-tool-treemenu",
      model: ["state.marker", "state.marker_tags", "state.time", "locale"]
    }, {
      component: Vizabi.Component.get("datanotes"),
      placeholder: ".vzb-tool-datanotes",
      model: ["state.marker", "locale"]
    }, {
      component: Vizabi.Component.get("steppedspeedslider"),
      placeholder: ".vzb-tool-stepped-speed-slider",
      model: ["state.time", "locale"]
    }];

    //constructor is the same as any tool
    this._super(placeholder, external_model);
  },

  default_model: {
    state: {
      marker_tags: {}
    },
    ui: {
      chart: {
        stacked: true,
        inpercent: false,
        flipSides: true
      },
      "buttons": ["colors", "inpercent", "side", "moreoptions", "fullscreen"],
      "dialogs": {
        "popup": ["timedisplay", "colors", "side", "moreoptions"],
        "sidebar": ["timedisplay", "colors", "show"],
        "moreoptions": ["opacity", "speed", "colors", "side", "presentation", "about"]
      },
      presentation: false
    },
    locale: { }
  }


});

export default AgePyramid;
