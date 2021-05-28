import {Dialog, SingleHandleSlider} from "VizabiSharedComponents";

/*
 * grouping dialog
 */

class Grouping extends Dialog {

  constructor(config){
    config.template = `
      <div class='vzb-dialog-modal'>
        <div class="vzb-dialog-title"> 
          <span data-localise="buttons/grouping"><span>
        </div>
            
        <div class="vzb-dialog-content">
          <div class="vzb-dialog-groups"></div>
          <div class="vzb-dialog-placeholder"></div>
        </div>

        <div class="vzb-dialog-buttons">
          <div data-click="closeDialog" class="vzb-dialog-button vzb-label-primary">
            <span data-localise="buttons/ok"></span>
          </div>
        </div>
      </div>
    `;

    const GROUP_KEY = "age";

    const aggregateModel = function() {
      const _this = this;
      return  {
        get value() {
          return _this.encoding.aggregate.grouping[GROUP_KEY].grouping;
        },
        set value(value) {
          _this.encoding.aggregate.config.grouping[GROUP_KEY].grouping = value;
        }
      }
    }

    const groupStops = [1, 5, 10, 15];
    config.options = Object.assign(config.options || {}, {groupStops});

    config.subcomponents = [{
      type: SingleHandleSlider,
      placeholder: ".vzb-dialog-placeholder",
      //model: ["state.time", "locale"],
      options: {
        value: "value",
        submodelFunc: aggregateModel,
        snapValue: true,
        suppressInput: true,
        domain: groupStops
      }
    }];

    super(config);

  }

  setup(options) {
    super.setup(options);

    const groups = this.element.select(".vzb-dialog-groups");

    groups.selectAll(".vzb-dialog-groups-title")
      .data(options.groupStops)
      .enter()
      .append("span")
      .attr("class", ".vzb-dialog-groups-title")
      .text(d => d);
  }
}




const _Grouping = {

/**
 * Initializes the dialog component
 * @param config component configuration
 * @param context component context (parent)
 */
  init(config, parent) {
    this.name = "grouping";

    // in dialog, this.model_expects = ["state", "data"];

    this.groupStops = [1, 5, 10, 15];

    this.components = [
      {
        component: singlehandleslider,
        placeholder: ".vzb-dialog-placeholder",
        model: ["state.entities_age", "locale"],
        arg: "grouping",
        properties: {
          snapValue: true,
          suppressInput: true,
          domain: this.groupStops
        }
      }
    ];

    this._super(config, parent);
  },

  readyOnce() {
    this._super();
    //    this.element = d3.select(this.element);
    const groups = this.element.select(".vzb-dialog-groups");

    groups.selectAll(".vzb-dialog-groups-title")
      .data(this.groupStops)
      .enter()
      .append("span")
      .attr("class", ".vzb-dialog-groups-title")
      .text(d => d);
  }
};

// const decorated = decorate(Grouping, {
//   "MDL": computed
// });
Dialog.add("grouping", Grouping);
export { Grouping };
