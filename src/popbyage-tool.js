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
} from "@vizabi/shared-components";
import { VizabiPopByAge } from "./popbyage-cmp.js";
import { Grouping } from "./dialogs/grouping/grouping.js"; Grouping;
import { Side } from "./dialogs/side/side.js"; Side;

export default class PopByAge extends BaseComponent {

  constructor(config){
    
    const fullMarker = config.model.markers?.pyramid;
    const fullMarkerLegend = config.model.markers?.legend;
    config.Vizabi.utils.applyDefaults(fullMarker?.config || {}, PopByAge.DEFAULT_MODEL.pyramid);   
    config.Vizabi.utils.applyDefaults(fullMarkerLegend?.config || {}, PopByAge.DEFAULT_MODEL.legend);  

    const frameType = config.Vizabi.stores.encodings.modelTypes.frame;
    const { marker, splashMarker } = frameType.splashMarker(fullMarker);
    
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
  
    config.locale.Vizabi = config.Vizabi;
    config.layout.Vizabi = config.Vizabi;
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
  "locale": { "id": "en", "shortNumberFormat": true },
  "layout": { "projector": false },

  "buttons": {
    "buttons": ["colors", "markercontrols", "lock", "sided","inpercent", "moreoptions", "sidebarcollapse", "fullscreen"]
  },
  "dialogs": {
    "dialogs": {
      "popup": ["timedisplay", "colors", "markercontrols", "moreoptions"],
      "sidebar": ["timedisplay", "colors", "markercontrols", "grouping"],
      "moreoptions": ["opacity", "speed", "grouping", "colors", "side", "presentation", "about"],
    },
    "markercontrols": {
      "disableSlice": true,
      "disableSwitch": true,
      "disableAddRemoveGroups": true,
      "primaryDim": null,
      "drilldown": null,
      "shortcutForSwitch": false,
      "shortcutForSwitch_allow": null
    }
  },
  "marker-contextmenu": {
    "primaryDim": null,
    "drilldown": null,
  },
  "time-slider": {
    "show_value": false
  },
  "chart": {
    "mode": "smallMultiples",
    "stacked": true,
    "inpercent": true,
    "flipSides": true,
    "lockActive": true,
    "lockNonSelected": 0,
    "showForecast": true,
    "showForecastOverlay": false,
    "pauseBeforeForecast": false,
    "endBeforeForecast": null, //value like "2022", auto-resolved to current time minus one frame step
    "overhang": true,
    "opacityHighlight": 1.0,
    "opacitySelect": 1.0,
    "opacityHighlightDim": 0.1,
    "opacitySelectDim": 0.3,
    "opacityRegular": 1,
  },
  "data-warning": {
    "enable": false,
    "margin": {
      "LARGE": { "bottom": 90 },
      "MEDIUM": { "bottom": 70 },
      "SMALL": { "bottom": 50 }
    }
  },
  "tree-menu": {
    "showDataSources": false,
    "folderStrategyByDataset": {}
  }
};

PopByAge.DEFAULT_MODEL = {
  "pyramid": {
    "requiredEncodings": ["x"],
    "encoding": {
      "show": {
        "modelType": "selection",
      },
      "selected": {
        "modelType": "selection"
      },
      "highlighted": {
        "modelType": "selection"
      },
      "x": { "data": { } },
      "y": {
        "data": { },
        "scale": { "type": "linear" }
      },
      "aggregate": {
        "modelType": "aggregate",
        "data": { "ref": "markers.pyramid.config.encoding.x.data" },
        "measures": ["x"],
        "grouping": {
          //example for your data
          //  "age": { "grouping": 1 } 
        }
      },
      "order": {
        "modelType": "order",
        "direction": "asc",
        "data": { "ref": "markers.pyramid.config.encoding.y.data" }
      },
      "orderFacets": {
        "modelType": "order",
        //example for your data:
        //  "direction": { "ref": "markers.pyramid.data.filter.config.dimensions.geo.$or.0.geo.$in" },
        //  "data": { "ref": "markers.pyramid.encoding.facet_column.data" }
      },
      "label": {
        "data": {
          "modelType": "entityPropertyDataConfig"
        }
      },
      "frame": {
        //interpolate: false //some possible exotic customisation :)
        "modelType": "frame",
        "playbackSteps": 1, //changes w aggregation
        "splash": true
      },
      "color": {
        "data": { "constant": "_default" },
        "scale": {
          "modelType": "color"
        }
      },
      "repeat": {
        "modelType": "repeat",
        "allowEnc": ["x"]
      },
      "side": {
        "data": {
          //set in custom config like so:
          "constant": "true"
          //alternatively: 
          // "space": ["gender"],
          // "concept": "gender"
        },
        //set in custom config like so:
        // "defaultConcept": "gender"
      },
      "facet_column": {
        "data": {
          "modelType": "entityMembershipDataConfig",
          //set space and concept like so:
          //  "space": ["geo"],
          //  "constant": null,
          //  "concept": "geo",
          //alternatively, constant="none" or magic concept="is--" with possible exceptions
          //  "concept": "world_4region"
          //  "exceptions": {"is--country": "geo"}
        }
      },
    }
  },
  "legend": {
    "data": {
      "ref": {
        "transform": "entityConceptSkipFilter",
        "path": "markers.pyramid.encoding.color"
      }
    },
    "encoding": {
      "color": {
        "data": {
          "concept": { "ref": "markers.pyramid.encoding.color.data.concept" },
          "constant": { "ref": "markers.pyramid.encoding.color.data.constant" }
        },
        "scale": {
          "modelType": "color",
          "palette": { "ref": "markers.pyramid.encoding.color.scale.palette" },
          "domain": null,
          "range": null,
          "type": null,
          "zoomed": null,
          "zeroBaseline": false,
          "clamp": false,
          "allowedTypes": null
        }
        //"scale": { "ref": "markers.pyramid.encoding.color.scale" }
      },
      "name": { 
        "data": {
          "concept": {"filter": { "concept": { "$in": ["name"]} } }
        }
      },
      "order": {
        "modelType": "order",
        "direction": "asc",
        "data": {
          "concept": {"filter": { "concept": { "$in": ["rank"]} } }
        }
      },
      "map": { 
        "data": {
          "concept": {"filter": { "concept": { "$in": ["shape_lores_svg", "shape", "svg"]} } }
        }
      }
    }
  }
};

PopByAge.versionInfo = { version: __VERSION, build: __BUILD, package: __PACKAGE_JSON_FIELDS, sharedComponents: versionInfo};
