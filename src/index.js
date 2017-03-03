import "./styles.scss";
import component from "./component";


//BAR CHART TOOL
const PopByAge = Vizabi.Tool.extend("PopByAge", {

  /**
   * Initializes the tool (Bar Chart Tool).
   * Executed once before any template is rendered.
   * @param {Object} placeholder Placeholder element for the tool
   * @param {Object} external_model Model as given by the external page
   */
  init(placeholder, external_model) {

    this.name = "popbyage";

    //specifying components
    this.components = [{
      component,
      placeholder: ".vzb-tool-viz",
      model: ["state.time", "state.marker", "state.entities", "state.entities_side", "state.entities_allpossible", "state.entities_geodomain", "locale", "ui"] //pass models to component
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

  validate(model) {
    model = this.model || model;

    this._super(model);

    //validate on first model set only
    if (!this.model) {
      const entities = model.state.entities;
      if (Object.keys(entities.show).length > 0) {
        const show = {};
        if (entities.show[entities.dim] && Object.keys(entities.show).length !== 1) {
          show[entities.dim] = entities.show[entities.dim];
        }
        if (!entities.show[entities.dim] || !(Object.keys(entities.show).length == 1)) {
          entities.show = show;
        }
      }

      const entities_geodomain = model.state.entities_geodomain;
      entities_geodomain.skipFilter = model.state.entities.dim === entities_geodomain.dim ||
        model.state.entities_side.dim === entities_geodomain.dim;
    }
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

export default PopByAge;
