import {
  BaseComponent,
  Icons,
  Utils,
  LegacyUtils as utils,
  axisSmart,
  DynamicBackground,
  TextEllipsis
} from "VizabiSharedComponents";

import {
  decorate,
  computed,
  runInAction
} from "mobx";

const {ICON_QUESTION} = Icons;

const PROFILE_CONSTANTS = {
  SMALL: {
    margin: {
      top: 50,
      right: 20,
      left: 40,
      bottom: 20,
      between: 10
    },
    infoElHeight: 16,
    centerWidth: 2,
    titlesSpacing: 5
  },
  MEDIUM: {
    margin: {
      top: 70,
      right: 40,
      left: 60,
      bottom: 20,
      between: 20
    },
    infoElHeight: 20,
    centerWidth: 2,
    titlesSpacing: 10
  },
  LARGE: {
    margin: {
      top: 80,
      right: 60,
      left: 60,
      bottom: 30,
      between: 20
    },
    infoElHeight: 22,
    centerWidth: 2,
    titlesSpacing: 20
  }
}

const PROFILE_CONSTANTS_FOR_PROJECTOR = {
  MEDIUM: {
    margin: { top: 120, right: 50, left:80, bottom: 60, between: 30 },
    infoElHeight: 32
  },
  LARGE: {
    margin: { top: 120, right: 70, left: 100, bottom: 70, between: 30 },
    infoElHeight: 32
  }
}

const SYMBOL_KEY = Symbol.for("key");
const SYMBOL_KEY2 = Symbol.for("key2");
const SYMBOL_STACKEDSUM = Symbol.for("stackedSum");

//
// POPBYAGE CHART COMPONENT
class _VizabiPopByAge extends BaseComponent {

  constructor(config) {
    config.subcomponents = [{
      type: DynamicBackground,
      placeholder: ".vzb-bc-year-now"
    }];

    config.template = `
      <svg class="vzb-popbyage-svg">
        <g class="vzb-bc-header">
            <g class="vzb-bc-axis-x-title">
              <text></text>
            </g>
            <g class="vzb-bc-axis-x-info vzb-noexport"></g>
            <g class="vzb-bc-year-now"></g>
            <text class="vzb-bc-year vzb-bc-year-locked"></text>
        </g>
        <g class="vzb-bc-graph">
            <text class="vzb-bc-title"></text>
            <text class="vzb-bc-title vzb-bc-title-right"></text>
            <text class="vzb-bc-title vzb-bc-title-center"></text>

            <g class="vzb-bc-axis-y-title"></g>

            <g class="vzb-bc-axis-y"></g>

            <svg class="vzb-bc-bars-crop">
                <g class="vzb-bc-bars"></g>
            </svg>

            <svg class="vzb-bc-locked-crop">
                <g class="vzb-bc-paths"></g>
            </svg>

            <g class="vzb-bc-axis-x"></g>
            <g class="vzb-bc-axis-x vzb-bc-axis-x-left"></g>

            <svg class="vzb-bc-labels-crop">
                <g class="vzb-bc-labels"></g>
            </svg>

            <g class="vzb-bc-axis-labels">
                <!-- <text class="vzb-x_label">Lifespan</text>
                      <text class="vzb-y_label">Lifespan</text> -->
            </g>
        </g>
        <g class="vzb-bc-tooltip vzb-hidden">
            <rect class="vzb-tooltip-border"></rect>
            <text class="vzb-tooltip-text"></text>
        </g>
        <rect class="vzb-bc-forecastoverlay vzb-hidden" x="0" y="0" width="100%" height="100%" fill="url(#vzb-bc-pattern-lines)" pointer-events='none'></rect>
      </svg>
      <svg>
        <defs>
            <pattern id="vzb-bc-pattern-lines" x="0" y="0" patternUnits="userSpaceOnUse" width="50" height="50" viewBox="0 0 10 10">
                <path d='M-1,1 l2,-2M0,10 l10,-10M9,11 l2,-2' stroke='black' stroke-width='3' opacity='0.08'/>
            </pattern>
        </defs>
      </svg>
    `;
    super(config);
  }

  setup() {
    this.state = {};

    this.DOM = {
      svg: this.element.select(".vzb-popbyage-svg"),
      xTitleEl: this.element.select(".vzb-bc-axis-x-title"),
      xInfoEl: this.element.select(".vzb-bc-axis-x-info"),
      yearLocked: this.element.select(".vzb-bc-year-locked"),
      forecastOverlay: this.element.select(".vzb-bc-forecastoverlay")
    };

    this._year = this.findChild({type: "DynamicBackground"});

    this._textEllipsis = new TextEllipsis(this);
    this._textEllipsis.setTooltip(this.element.select(".vzb-bc-tooltip"));

    this.interaction = this._interaction();

    const _this = this;

    this._attributeUpdaters = {
      _newWidth(d, i) {
        //d["x_"] = 0;
        let width;
        width = _this.frame[d[SYMBOL_KEY2]] && _this.frame[d[SYMBOL_KEY2]].x;
        d["width_"] = width ? _this.xScale(width) : 0;
        if (_this.ui.inpercent) {
          d["width_"] /= _this.total[d.i][d[_this.PREFIXEDSIDEDIM]];
        }
        return d.width_;
      },
      _newX(d, i) {
        const prevSbl = this.previousSibling;
        if (prevSbl) {
          const prevSblDatum = d3.select(prevSbl).datum();
          d["x_"] = prevSblDatum.x_ + prevSblDatum.width_;
        }
        // else {
        //   d["x_"] = 0;
        // }
        return d.x_;
      }
    };

    // this.xScale = null;
    // this.yScale = null;
    // this.cScale = null;

    this.xAxis = axisSmart("bottom");
    this.xAxisLeft = axisSmart("bottom");
    this.yAxis = axisSmart("left");
    this.SHIFTEDAGEDIM = "s_age";

    this.graphTemplate = new XMLSerializer().serializeToString(this.element.select(".vzb-bc-graph").node());
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected,
      highlighted: this.model.encoding.highlighted,
      y: this.model.encoding.y,
      x: this.model.encoding.x,
      // y: this.model.encoding.get(this.state.alias.y || "y"),
      // x: this.model.encoding.get(this.state.alias.x || "x"),
      side: this.model.encoding.side,
      color: this.model.encoding.color,
      label: this.model.encoding.label,
      facet: this.model.encoding.facet,
      aggregate: this.model.encoding.aggregate
    };
  }

  get groupBy() {
    this.DOM.labels.text(""); //TODO: find more clear way
    return this.MDL.aggregate.grouping["age"].grouping;
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.yAxis.tickFormat(this.localise);
    this.xAxis.tickFormat(this.localise);
    this.xAxisLeft.tickFormat(this.localise);

    this.geoDomainDimension = this.MDL.facet.data.concept;
    this.geoDomainDefaultValue = "world";//this.model.entities_geodomain.show[this.geoDomainDimension]["$in"][0];

    //this.groupBy = this.MDL.aggregate.grouping["age"].grouping;
    this.timeSteps = this.MDL.frame.stepScale.domain();

    if (this._updateLayoutProfile()) return; //return if exists with error


    this.addReaction(this._updateSmallMultiplesMode);
    this.addReaction(this.checkDimensions);
    this.addReaction(this._clearLockAndSelectedOnGroupByChange);
    this.addReaction(this._updateIndicators);
    //this.addReaction(this._checkFrameValue);
    this.addReaction(this.updateUIStrings);
    //this.addReaction(this._setupLimits);
    //this.addReaction(this._updateLimits);
    this.addReaction(this._updateSideTitles);
    this.addReaction(this.updateSize);
    this.addReaction(this._updateForecastOverlay);
    //this.addReaction(this._updateStepSeries);
    this.addReaction(this.drawData);
    this.addReaction(this._redrawLocked);
    this.addReaction(this._highlightBars);


  }

  _updateLayoutProfile() {
    this.services.layout.size;

    this.profileConstants = this.services.layout.getProfileConstants(PROFILE_CONSTANTS, PROFILE_CONSTANTS_FOR_PROJECTOR);
    this.height = this.element.node().clientHeight || 0;
    this.width = this.element.node().clientWidth || 0;
    if (!this.height || !this.width) return utils.warn("Chart _updateProfile() abort: container is too little or has display:none");
  }

  get stepSeries() {
    return this._getStepSeries();
  }

  _getStepSeries() {
    let stepSeries;
    if(this.groupBy != 1) {
      if(!this._isDragging()) {
          const currentStep = this.MDL.frame.step ?? 0;
          const pStepSeries = d3.range(currentStep, -1, -this.groupBy).reverse();
          const nStepSeries = d3.range(currentStep, this.MDL.frame.stepCount, this.groupBy);
          stepSeries = this.prevStepSeries = pStepSeries.concat(nStepSeries.slice(1));
      } else {
        stepSeries = this.prevStepSeries;
      };
    } else {
        stepSeries = this.MDL.frame.stepScale.range();
    };
    return stepSeries;
  }

  _clearLockAndSelectedOnGroupByChange() {
    this.groupBy;
    runInAction(() => {
      if (this.someSelected) this.MDL.selected.data.filter.clear();
      if (this.lock) this.ui.lockNonSelected = this.lock = 0;
    });
  }

  drawData() {
    this.services.layout.size;

    const {
      frame,
      x,
      y,
      side,
      facet
    } = this.MDL;

    this.shiftScale = d3.scaleLinear()
      .domain([this.stepSeries[0], this.stepSeries[this.stepSeries.length - 1]])
      .range([0, this.stepSeries.length - 1])
      .clamp(true);

    const step = this.MDL.frame.step < this.stepSeries[0] ? this.stepSeries[0] 
      : this.MDL.frame.step > this.stepSeries[this.stepSeries.length - 1] ? this.stepSeries[this.stepSeries.length - 1]
        : this.MDL.frame.step;
     
    const stepFraction = this.MDL.frame.stepScale.domain().length == 1 ? 0 : (step - this.stepSeries[0]) % this.groupBy / this.groupBy;

    this.frame = stepFraction == 0 ? this._processData(step == this.MDL.frame.step ? this.model.dataArray : [...this.model.getDataMapByFrameValue(this.MDL.frame.stepScale.invert(step)).rows()])
      : 
      this._interpolateDiagonal(...(a=>[this.stepSeries[a],this.stepSeries[a+1]])(~~((this.MDL.frame.step - this.stepSeries[0])/ this.groupBy)).map(this.MDL.frame.stepScale.invert).map(v => this.model.getDataMapByFrameValue(v).rows()), stepFraction)
    this._updateEntities(true, 
      step ?? this.stepSeries[0],
      step == undefined ? this.MDL.frame.stepScale.domain()[0] : this.MDL.frame.stepScale.invert(step)
    );
    this.updateBarsOpacity();
  }

  _updateSmallMultiplesMode() {
    this.smallMultiples = this.ui.mode === "smallMultiples" && !this.stackSkip && this.stackKeys.length > 1;
    this._updateGraphs(this.smallMultiples ? this.stackKeys : ["undefined"]);
  }

  _updateGraphs(data) {
    const _this = this;
    let graph = this.DOM.svg.selectAll(".vzb-bc-graph").data(data)
    graph.exit().remove();
    ////replace code below when IE11 support will be skipped
    //  graph.enter().append("g")
    //   .attr("class", "vzb-bc-graph")
    //   .html(this.graphTemplate);
    graph.enter().append(function() {
      return this.ownerDocument.importNode(
        new DOMParser().parseFromString(_this.graphTemplate, 'application/xml').documentElement, true);
    });

    this.element.select(".vzb-bc-forecastoverlay").raise();
    this.element.select(".vzb-bc-tooltip").raise();
    this.__updateGraphDOM(this.DOM.graph = this.element.selectAll(".vzb-bc-graph"));
  }

  __updateGraphDOM(graph) {
    this.DOM.yAxisEl = graph.select(".vzb-bc-axis-y");
    this.DOM.xAxisEl = graph.select(".vzb-bc-axis-x");
    this.DOM.xAxisLeftEl = graph.select(".vzb-bc-axis-x-left");
    this.DOM.yTitleEl = graph.select(".vzb-bc-axis-y-title");
    this.DOM.title = graph.select(".vzb-bc-title");
    this.DOM.titleRight = graph.select(".vzb-bc-title-right");
    this.DOM.titleCenter = graph.select(".vzb-bc-title-center");
    this.DOM.barsCrop = graph.select(".vzb-bc-bars-crop");
    this.DOM.lockedCrop = graph.select(".vzb-bc-locked-crop");
    this.DOM.labelsCrop = graph.select(".vzb-bc-labels-crop");
    this.DOM.bars = this.DOM.barsCrop.select(".vzb-bc-bars");
    this.DOM.lockedPaths = this.DOM.lockedCrop.select(".vzb-bc-paths");
    this.DOM.labels = this.DOM.labelsCrop.select(".vzb-bc-labels");
  }

  getGraphWidth(width, marginBetween) {
    let _width = width || this.width;
    if (this.smallMultiples) {
      const length = this.DOM.graph.data().length;
      _width -= marginBetween * (length - 1);
      return this._calcDomainScalers().map(scaler => _width * scaler);
    } else {
      return [_width];
    }
  }

  _processData(dataArray) {
    const data = {};
    for (let index = 0; index < dataArray.length; index++) {
      const element = dataArray[index];
      data[element[SYMBOL_KEY]] = element;
    }
    return data;
  }

  _interpolateDiagonal(pData, nData, fraction) {
    const data = {};
    let newRow, shiftedRow;
    newRow = Object.assign({}, nData.next().value);
    data[newRow[SYMBOL_KEY]] = newRow;
    for (const row of nData) {
      newRow = Object.assign({}, row);
      shiftedRow = pData.next().value;
      newRow.x = shiftedRow.x + (newRow.x - shiftedRow.x) * fraction;
      data[newRow[SYMBOL_KEY]] = newRow;
    }
    return data;
  }

  _getData(name) {
    return this.state.facet ? this.MDL.facet[name][this.state.facet.index] : this.model[name];
  }

  checkDimensions() {
    const {
      frame,
      facet,
      y,
      color,
      side
    } = this.MDL;

    const sideDim = this.SIDEDIM = //"side";
      side.data.isConstant ? side.data.constant : side.data.concept;
    this.PREFIXEDSIDEDIM = "side_" + this.SIDEDIM;
    const stackDim = this.STACKDIM = //"facet";
      facet.data.concept;
    this.PREFIXEDSTACKDIM = "stack_" + this.STACKDIM;
    this.AGEDIM = //"y";
      y.data.concept;
    this.TIMEDIM = //"frame";
      frame.data.concept;

    this.colorUseConstant = color.data.isConstant;
    this.stackSkip = this.colorUseConstant || stackDim == sideDim;
    this.geoLess = stackDim !== this.geoDomainDimension && sideDim !== this.geoDomainDimension;
    this.sideSkip = side.data.isConstant;
  }

  updateUIStrings() {
    const _this = this;

    const xTitle = this.DOM.xTitleEl.select("text").text(this.localise("popbyage/title"));

    const conceptPropsX = this.MDL.x.data.conceptProps;

    const dataNotes = this.root.findChild({type: "DataNotes"});

    utils.setIcon(this.DOM.xInfoEl, ICON_QUESTION)
      .select("svg").attr("width", "0px").attr("height", "0px")
      .style('opacity', Number(Boolean(conceptPropsX.description || conceptPropsX.sourceLink)));

    this.DOM.xInfoEl.on("click", () => {
      dataNotes.pin();
    });
    this.DOM.xInfoEl.on("mouseover", function() {
      if (_this._isDragging()) return;
      const rect = this.getBBox();
      const coord = utils.makeAbsoluteContext(this, this.farthestViewportElement)(rect.x - 10, rect.y + rect.height + 10);
      const toolRect = _this.root.element.node().getBoundingClientRect();
      const chartRect = _this.element.node().getBoundingClientRect();
      dataNotes
        .setEncoding(_this.MDL.x)
        .show()
        .setPos(coord.x + chartRect.left - toolRect.left, coord.y);
    });
    this.DOM.xInfoEl.on("mouseout", () => {
      if (_this._isDragging()) return;
      dataNotes.hide();
    });

    // var titleStringY = this.model.marker.axis_y.getConceptprops().name;

    // var yTitle = this.yTitleEl.selectAll("text").data([0]);
    // yTitle.enter().append("text");
    // yTitle
    //   .attr("y", "-6px")
    //   .attr("x", "-9px")
    //   .attr("dx", "-0.72em")
    //   .text(titleStringY);
  }

  get ageKeys() {
    return  this.MDL.y.data.domain;
  }

  get sideKeys() {
    return this.MDL.side.scale.domain;
  }

  get stackKeys() {
    return this.MDL.facet.scale.domain;
  }

  get xScale() {
    return this.MDL.x.scale.d3Scale.domain(this.domains[0]);
  }

  get yScale() {
    return this.MDL.y.scale.d3Scale;
  }

  get cScale() {
    return this.MDL.color.scale.d3Scale;
  }

  /**
   * Changes labels for indicators
   */
  _updateIndicators() {
    const {
      frame,
      x,
      y,
      side,
      color
    } = this.MDL;
    const _this = this;

    const groupBy = this.groupBy;

    frame.config.playbackSteps = groupBy;
    this.duration = frame.speed;
    this.stacked = this.ui.stacked && !color.data.isConstant;

    this.twoSided = this.sideKeys.length > 1;
    if (this.twoSided) {
      this.xScaleLeft = this.xScale.copy();
    }
  }

  _updateForecastOverlay() {
    this.DOM.forecastOverlay.classed("vzb-hidden",
    !this.ui.showForecast ||
    !this.ui.showForecastOverlay ||
    !this.ui.endBeforeForecast ||
      (this.MDL.frame.value <= this.MDL.frame.parseValue(this.ui.endBeforeForecast))
    );
  }

  _updateSideTitles() {
    const _this = this;
    const label = this.MDL.label.data.concept;

    const sideItems = this.sideItems = this.SIDEDIM === "true" ? {} : this.sideKeys
      .reduce((obj,m) => {
        obj[m] = this.MDL.label.data.response.get({[this.SIDEDIM]: m})[label][this.SIDEDIM];
        return obj;
      }, {});

    const stackItems = this.stackItems = this.stackKeys
      .reduce((obj,m) => {
        obj[m] = this.MDL.label.data.response.get({[this.STACKDIM]: m})[label][this.STACKDIM];
        return obj;
      }, {});

    this.DOM.titleRight.classed("vzb-hidden", !this.twoSided);
    if (this.twoSided) {
      this.DOM.title.text(sideItems[this.sideKeys[1]]).call(this._textEllipsis.clear);
      this.DOM.titleRight.text(sideItems[this.sideKeys[0]]).call(this._textEllipsis.clear);
    } else {
      const title = this.sideKeys.length && sideItems[this.sideKeys[0]] ? sideItems[this.sideKeys[0]] : "";
      this.DOM.title.text(title).call(this._textEllipsis.clear);
    }

    if (this.smallMultiples) {
      this.DOM.titleCenter.call(this._textEllipsis.clear).each(function(d, i) {
        d3.select(this).text(stackItems[_this.stackKeys[i]]);
      });
    } else {
      const title = this.stackKeys.length && stackItems[this.stackKeys[0]] && !this.stackSkip ? stackItems[this.stackKeys[0]] : "";
      this.DOM.titleCenter.text(title).call(this._textEllipsis.clear);
    }
  }

  _interaction() {
    const _this = this;
    return {
      mouseover(d, i) {
        if (utils.isTouchDevice()) return;
        _this.MDL.highlighted.data.filter.set(d, JSON.stringify({color: d[_this.STACKDIM]}));
        _this._showLabel(d);
      },
      mouseout(d, i) {
        if (utils.isTouchDevice()) return;
        _this.MDL.highlighted.data.filter.delete(d);
      },
      click(d, i) {
        if (utils.isTouchDevice()) return;
        _this.MDL.selected.data.filter.toggle(d);
      },
      tap(d) {
        d3.event.stopPropagation();
        _this.MDL.selected.data.filter.set(d);
      }
    };
  }

  /**
   * Updates entities
   */
  _updateEntities(reorder, step, frameValue) {
    const _this = this;
    const groupBy = this.groupBy;
    const frame = this.MDL.frame;
    const sideDim = this.SIDEDIM;
    const prefixedSideDim = this.PREFIXEDSIDEDIM;
    const ageDim = this.AGEDIM;
    const stackDim = this.STACKDIM;
    const prefixedStackDim = this.PREFIXEDSTACKDIM;
    const timeDim = this.TIMEDIM;
    const duration = (frame.playing) ? frame.speed : 0;
    //const frameValue = this.MDL.frame.stepScale.invert(step);
    //var group_offset = this.model.marker.group_offset ? Math.abs(this.model.marker.group_offset % groupBy) : 0;

    if (this.ui.inpercent) {
      this.total = this._updateTotal(frameValue);
    }

    const domain = d3.extent(this.yScale.domain());

    const nextStep = d3.bisectLeft(this.stepSeries, step);

    const shiftedAgeDim = this.SHIFTEDAGEDIM;

    const markers = this.ageKeys.map(data => {
        const o = {};
    o[ageDim] = o[shiftedAgeDim] = +data;
    o[ageDim] -= nextStep * groupBy;
    return o;
  });

    const ageData = markers.slice(0);

    const outAge = {};
    outAge[shiftedAgeDim] = markers.length * groupBy;
    outAge[ageDim] = outAge[shiftedAgeDim] - nextStep * groupBy;

    this.ageShift = nextStep * groupBy;

    if (nextStep) ageData.push(outAge);

    const stacks = _this.stacked ? _this.stackKeys : [_this.geoDomainDefaultValue];
    const geoDomainDefaultValue = this.geoDomainDefaultValue;
    const geoDomainDimension = this.geoDomainDimension;

    // for(let i = 0, j = ageData.length; i < j; i++) {
    //   const d = ageData[i];
    //   d["side"] = _this.sideKeys.map(m => {
    //     const r = {};
    //     r[ageDim] = d[ageDim];
    //     r[shiftedAgeDim] = d[shiftedAgeDim];
    //     r[prefixedSideDim] = m;
    //     r[sideDim] = m;
    //     r["stack"] = stacks.map(m => {
    //       const s = {};
    //       s[geoDomainDimension] = geoDomainDefaultValue;
    //       s[ageDim] = r[ageDim];
    //       s[shiftedAgeDim] = r[shiftedAgeDim];
    //       s[sideDim] = r[sideDim];
    //       s[stackDim] = m;
    //       s[prefixedSideDim] = r[prefixedSideDim];
    //       s[prefixedStackDim] = m;
    //       s["x_"] = 0;
    //       s["width_"] = 0;
    //       return s;
    //     });
    //     return r;
    //   });
    // }
    const transition = duration ? d3.transition()
      .duration(duration)
      .ease(d3.easeLinear)
      : null;

    const oneBarHeight = this.height / (domain[1] - domain[0]);
    const barHeight = oneBarHeight * groupBy;
    const firstBarOffsetY = this.height - barHeight;

    const stepShift = (ageData[0][shiftedAgeDim] - ageData[0][ageDim]) - this.shiftScale(step) * groupBy;

    this.barsData = [];

    this.ageBars = this.DOM.bars.selectAll(".vzb-bc-bar")
      .data((d, i) => (_this.barsData[i] = ageData.map(m => {
        const p = {};
        p[ageDim] = m[ageDim];
        p[shiftedAgeDim] = m[shiftedAgeDim];
        p.i = i;
        return p;
      }), this.barsData[i]), d => d[ageDim])
      .join(
        enter => enter.append("g")
          .attr("class", d => "vzb-bc-bar " + "vzb-bc-bar-" + d[ageDim])
          .attr("transform", (d, i) => "translate(0," + (firstBarOffsetY - (d[shiftedAgeDim] - domain[0] - groupBy) * oneBarHeight) + ")"),
        update => update,
        exit => exit.remove()
      ).call(ageBars => {
        if (duration) {
          ageBars.transition(transition)
            .attr("transform", (d, i) => "translate(0," + (firstBarOffsetY - (d[shiftedAgeDim] - domain[0] - stepShift) * oneBarHeight) + ")");
        } else {
          ageBars.interrupt()
            .attr("transform", (d, i) => "translate(0," + (firstBarOffsetY - (d[shiftedAgeDim] - domain[0] - stepShift) * oneBarHeight) + ")");
        }
      });

    this.sideBars = this.ageBars.selectAll(".vzb-bc-side")
      .data((d, i) => (d.side = _this.sideKeys.map(m => {
        const r = {};
        r[ageDim] = d[ageDim];
        r[shiftedAgeDim] = d[shiftedAgeDim];
        r[prefixedSideDim] = m;
        r[sideDim] = m;
        r.i = d.i;
        return r;
      }), d.side), d => d[prefixedSideDim])
      .join(
        enter => enter.append("g")
          .attr("class", (d, i) => "vzb-bc-side " + "vzb-bc-side-" + (!i != !_this.twoSided ? "right" : "left"))
          .attr("transform", (d, i) => i ? ("scale(-1,1) translate(" + _this.profileConstants.centerWidth + ",0)") : ""),
        update => update,
        exit => exit.remove()
      )
      .call(sideBars => {
        if (reorder) {
          sideBars.attr("class", (d, i) => "vzb-bc-side " + "vzb-bc-side-" + (!i != !_this.twoSided ? "right" : "left"))
            .attr("transform", (d, i) => i ? ("scale(-1,1) translate(" + _this.profileConstants.centerWidth + ",0)") : "");
        }
      });

    const _attributeUpdaters = this._attributeUpdaters;
    const keyFn = this.model.dataMap.keyFn;

    this.stackBars = this.sideBars.selectAll(".vzb-bc-stack")
      .data(d => ( d.stack = (_this.smallMultiples ? [stacks[d.i]] : stacks).map(m => {
        const s = {};
        s[geoDomainDimension] = geoDomainDefaultValue;
        s[ageDim] = d[ageDim];
        s[shiftedAgeDim] = d[shiftedAgeDim];
        s[sideDim] = d[sideDim];
        s[stackDim] = m;
        s[prefixedSideDim] = d[prefixedSideDim];
        s[prefixedStackDim] = m;
        s["x_"] = 0;
        s["width_"] = 0;
        s[SYMBOL_KEY] = keyFn({
          [ageDim]: d[ageDim],
          [sideDim]: d[prefixedSideDim],
          [stackDim]: m,
        })
        s[SYMBOL_KEY2] = keyFn({
          [ageDim]: d[shiftedAgeDim],
          [sideDim]: d[prefixedSideDim],
          [stackDim]: m,
        })
        s.i = d.i;
        return s;
      }), d.stack), d => d[prefixedStackDim])
      .join(
        enter => enter.append("rect")
          .attr("class", (d, i) => "vzb-bc-stack " + "vzb-bc-stack-" + i + (_this.highlighted ? " vzb-dimmed" : ""))
          .attr("y", 0)
          .attr("height", barHeight - (groupBy > 2 ? 1 : 0))
          .attr("fill", d => {
            return _this.cScale(_this.frame[d[SYMBOL_KEY2]] && _this.frame[d[SYMBOL_KEY2]].color || d[prefixedStackDim])
          })
          //.attr("width", _attributeUpdaters._newWidth)
          //.attr("x", _attributeUpdaters._newX)
          .on("mouseover", _this.interaction.mouseover)
          .on("mouseout", _this.interaction.mouseout)
          .on("click", _this.interaction.click)
          .onTap(_this.interaction.tap),
        update => update,
        exit => exit.remove()
      )
      .call(stackBars => {
        if (reorder) stackBars
        .attr("class", (d, i) => "vzb-bc-stack " + "vzb-bc-stack-" + i + (_this.highlighted ? " vzb-dimmed" : ""))
        .attr("fill", d => {
          return _this.cScale(_this.frame[d[SYMBOL_KEY2]] && _this.frame[d[SYMBOL_KEY2]].color || d[prefixedStackDim])
        })
        .order();

        if (duration) {
          stackBars
            .transition(transition)
            .attr("width", _attributeUpdaters._newWidth)
            .attr("x", _attributeUpdaters._newX);
        } else {
          stackBars.interrupt()
            .attr("width", _attributeUpdaters._newWidth)
            .attr("x", _attributeUpdaters._newX);
        }

      });

    this.entityLabels = this.DOM.labels.selectAll(".vzb-bc-label text")
      .data(markers, d => d[shiftedAgeDim])
      .join(
        enter => enter.append("g")
          .attr("class", d => "vzb-bc-label" + " vzb-bc-label-" + d[shiftedAgeDim])
          .append("text")
          .attr("class", "vzb-bc-age"),
        update => update,
        exit => exit.remove()
      )
      .each((d, i) => {
        const yearOlds = _this.localise("popbyage/yearOlds");

        let age = parseInt(d[shiftedAgeDim], 10);

        if (groupBy > 1) {
          const nextAge = (age + groupBy - 1);
          age = age + "-to-" + (nextAge > domain[1] ? domain[1] : nextAge);
        }

        d["text"] = age + yearOlds;
      })
      .attr("y", (d, i) => firstBarOffsetY - (d[shiftedAgeDim] - domain[0]) * oneBarHeight - 10)
      .attr("dy", (d, i) => (d[shiftedAgeDim] + groupBy) > domain[1] ? (groupBy - domain[1] + d[shiftedAgeDim]) / groupBy * barHeight : 0);
    // .style("fill", function(d) {
    //   var color = _this.cScale(values.color[d[ageDim]]);
    //   return d3.rgb(color).darker(2);
    // });

    this._year.setText(this.localise(this.MDL.frame.value), this.duration);
  }

  _isDragging(){
    const timeslider = this.parent.findChild({type: "TimeSlider"});
    return timeslider && timeslider.ui.dragging;
  }

  //_setupLimits() {
  get allLimitsAndTotals() {
    this.groupBy;
    const steps = this.MDL.frame.stepScale.domain();
    return this._createTotalsAndLimits(this.model.getTransformedDataMap('filterRequired'), steps);
  }

  _createTotalsAndLimits(data, steps) {
    const limits = {};
    const totals = {};

    this.sideKeys.forEach(sideKey => {
      limits[sideKey] = {};
      steps.forEach(step => {
        limits[sideKey][step] = {};
        this.ageKeys.forEach(ageKey => {
          limits[sideKey][step][ageKey] = {};
        });
      });
    });

    [...this.stackKeys, SYMBOL_STACKEDSUM].forEach(stackKey => {
      totals[stackKey] = {};
      steps.forEach(step => {
        totals[stackKey][step] = {};
      });
    });

    const stackDim = this.STACKDIM;
    const sideDim = this.SIDEDIM;
    const timeDim = this.TIMEDIM;
    const ageDim = this.AGEDIM;

    let _stack, _side, _time, _age;

    for (const row of data.rows()) {
      _time = "" + row[timeDim];
      _stack = row[stackDim] ?? stackDim;
      _side = row[sideDim] ?? sideDim;
      _age = row[ageDim] ?? ageDim;

      totals[_stack][_time][_side] ??= 0;
      totals[_stack][_time][_side] += row.x;
      totals[SYMBOL_STACKEDSUM][_time][_side] ??= 0;
      totals[SYMBOL_STACKEDSUM][_time][_side] += row.x;

      limits[_side][_time][_age][_stack] = row.x;
      limits[_side][_time][_age][SYMBOL_STACKEDSUM] ??= 0;
      limits[_side][_time][_age][SYMBOL_STACKEDSUM] += row.x;
    };


    return {limits, totals};
  }

  //_updateLimits() {
  get domains() {
    this.groupBy;
    
    const maxLimits = {};
    const inpercentMaxLimits = {};
    const domains = [];
    if (this.ui.mode == "smallMultiples") {
      utils.forEach(this.stackKeys, (stackKey, i) => {
        this._createLimits(maxLimits[stackKey] = {}, inpercentMaxLimits[stackKey] = {}, this.allLimitsAndTotals.totals, stackKey);
        this._createDomains(domains, maxLimits, inpercentMaxLimits, stackKey, i);
      });
    } else {
      this._createLimits(maxLimits, inpercentMaxLimits, this.allLimitsAndTotals.totals);
      this._createDomains(domains, maxLimits, inpercentMaxLimits);
    }
    return domains;
  }

  _createLimits(maxLimits = {}, inpercentMaxLimits = {}, totals, stackKey) {
    const steps = this.MDL.frame.stepScale.domain();
    this.sideKeys.forEach(sideKey => {
      const inpercentLimitsArray = [];
      maxLimits[sideKey] = d3.max(steps.map(step => {
        const stepObj = this.allLimitsAndTotals.limits[sideKey][step];
        return d3.max(Object.values(stepObj).map(stacksObj => {
          const stackValue = stacksObj[stackKey ?? SYMBOL_STACKEDSUM];
          inpercentLimitsArray.push(stackValue / totals[stackKey ?? SYMBOL_STACKEDSUM][step][sideKey]);
          return stackValue;
        }));
      }));
      inpercentMaxLimits[sideKey] = d3.max(inpercentLimitsArray);
    })
  }

  _createDomains(domains, maxLimits = {}, inpercentMaxLimits = {}, stackKey, i) {
    const _this = this;
    const axisX = this.MDL.x;

    if (stackKey) {
      if (this.ui.inpercent) {
        domains[i] = [0, Math.max(...this.sideKeys.map(s => inpercentMaxLimits[stackKey][s]))];
      } else {
        domains[i] = (axisX.domainMin != null && axisX.domainMax != null) ? [+axisX.domainMin, +axisX.domainMax] : [0, Math.max(...this.sideKeys.map(s => maxLimits[stackKey][s]))];
      }
    } else {
      if (this.ui.inpercent) {
        domains[0] = [0, Math.max(...this.sideKeys.map(s => inpercentMaxLimits[s]))];
      } else {
        domains[0] = axisX.scale.config.domain ? axisX.scale.domain : [0, Math.max(...this.sideKeys.map(s => maxLimits[s]))];
      }
    }
  }

  _updateTotal(frame) {
    const total = {};
    if (this.ui.mode == "smallMultiples") {
      utils.forEach(this.stackKeys, (stackKey, i) => {
        total[i] = this.allLimitsAndTotals.totals[stackKey][frame] ? this.allLimitsAndTotals.totals[stackKey][frame] : this._interpolateBetweenTotals(this.timeSteps, this.allLimitsAndTotals.totals[stackKey], frame);
      });
    } else {
      total[0] = this.allLimitsAndTotals.totals[frame] ? this.allLimitsAndTotals.totals[frame] : this._interpolateBetweenTotals(this.timeSteps, this.allLimitsAndTotals.totals, frame);
    }
    return total;
  }

  _calcDomainScalers() {
    const domain = this.domains.map(m => m[1] - m[0])
    const sumDomains = domain.reduce((a, b) => a + b);
    return domain.map(d => d / sumDomains);
  }

  _interpolateBetweenTotals(timeSteps, totals, frame) {
    const nextStep = d3.bisectLeft(timeSteps, frame);
    const fraction = (frame - timeSteps[nextStep - 1]) / (timeSteps[nextStep] - timeSteps[nextStep - 1]);
    const total = {};
    utils.forEach(this.sideKeys, side => {
      total[side] = totals[timeSteps[nextStep]][side] * fraction + totals[timeSteps[nextStep - 1]][side] * (1 - fraction);
  });
    return total;
  }

  _redrawLocked() {
    this.services.layout.size;

    const _this = this;
    if (this.ui.lockNonSelected) {
      this.lock = this.ui.lockNonSelected;

      const lockTime = this.MDL.frame.parseValue(this.ui.lockNonSelected);
      const lockFrame = this.model.getDataMapByFrameValue(lockTime);
      const lockTotal = this._updateTotal(lockTime);
      this._makeOutlines(lockFrame, lockTotal);

      this.DOM.yearLocked.text("" + this.ui.lockNonSelected);
    } else {
      this.DOM.lockedPaths.text("");
      this.DOM.yearLocked.text("");
    }

  }

  _makeOutlines(frame, total) {
    const _this = this;

    const groupBy = this.groupBy;
    const barHeight = this.barHeight;
    const firstBarOffsetY = this.firstBarOffsetY + barHeight;

    const line = d3.line().curve(d3.curveStepBefore)
      .x(d => d.x)//_ + d.width_)
      .y((d, i) => firstBarOffsetY - barHeight * i  - (groupBy > 2 ? 1 : 0));

    const pathsData = this.barsData.map((barsData, _i) => {
      const stackIndex = [0, 0];

      return this.sideKeys.map((s, i) => {
        if (_this.stackSkip) {
          barsData[0].side[i].stack.forEach((d, j) => {
            if (d[_this.PREFIXEDSIDEDIM] === d[_this.PREFIXEDSTACKDIM]) {
              stackIndex[i] = j;
            }
          });
        }
        const data = {};
        data.d = barsData.map(age => {
          const r = {};
          const x = frame.getByStr(age.side[i].stack[stackIndex[i]][SYMBOL_KEY2])?.x;
          r.x = x ? _this.xScale(x) : 0;
            if (_this.ui.inpercent) {
              r.x /= total[_i][age.side[i].stack[stackIndex[i]][_this.PREFIXEDSIDEDIM]];
            }
          return r;
        });
        return data;
      });
    });

    const data = this.DOM.bars.selectAll(".vzb-bc-side-left").selectAll(".vzb-bc-stack-0").data();
    const color = this.cScale(data[0][this.PREFIXEDSTACKDIM])
    const colorShade = this.MDL.color.scale.palette.getColorShade({
      colorID: data[0][this.PREFIXEDSTACKDIM],
      shadeID: "shade"
    }) || "#000";//d3.hsl(color).darker(2);

    this.DOM.lockedPaths.each(function(d, _i) {
      const paths = d3.select(this).selectAll("path").data(pathsData[_i]);
      paths.exit().remove();
      paths.enter()
        .append("path")
        .merge(paths)
        .attr("d", (d, i) => line(d.d))
        .attr("stroke", "#000")//colorShade)
        .attr("transform", (d, i) => i ? ("scale(-1,1) translate(" + _this.profileConstants.centerWidth + ",0)") : "");
    });
  }

  updateSize() {
    this.services.layout.size;
    const _this = this;

    const {
      x,
      y
    } = this.MDL;

    const {
      graph,
      barsCrop,
      lockedCrop,
      labelsCrop,
      yAxisEl,
      xAxisEl,
      xAxisLeftEl,
      bars,
      lockedPaths,
      labels,
      title,
      titleCenter,
      titleRight,
      xTitleEl,
      xInfoEl,
      yearLocked,
    } = this.DOM;

    const margin = this.profileConstants.margin;
    const infoElHeight = this.profileConstants.infoElHeight;

    const deltaMarginTop = this.sideSkip ? margin.top * 0.23 : 0;
    //stage
    this.height = (parseInt(this.element.style("height"), 10) + deltaMarginTop - margin.top - margin.bottom) || 0;
    this.width = (parseInt(this.element.style("width"), 10) - margin.left - margin.right) || 0;
    this.fullWidth = parseInt(this.element.style("width"), 10) || 0;
    this.graphWidth = this.getGraphWidth(this.width, margin.between);

    if (this.height <= 0 || this.width <= 0) return utils.warn("Pop by age resize() abort: vizabi container is too little or has display:none");

    let _sum = 0;
    let _prevSum = 0;
    const graphWidthSum = this.graphWidth.map(width => {_prevSum = _sum; _sum += width; return _prevSum;});
    graph
      .attr("transform", (d, i) => "translate(" + Math.round(margin.left + margin.between * i + graphWidthSum[i]) + "," + (margin.top - deltaMarginTop) + ")");

    barsCrop
      .attr("width", (d, i) => this.graphWidth[i])
      .attr("height", Math.max(0, this.height));

    lockedCrop
      //.attr("width", (d, i) => this.graphWidth[i])
      .attr("height", Math.max(0, this.height));

    labelsCrop
      .attr("width", (d, i) => this.graphWidth[i])
      .attr("height", Math.max(0, this.height));

    const groupBy = this.groupBy;

    const domain = d3.extent(this.yScale.domain());
    this.oneBarHeight = this.height / (domain[1] - domain[0]);
    const barHeight = this.barHeight = this.oneBarHeight * groupBy; // height per bar is total domain height divided by the number of possible markers in the domain
    this.firstBarOffsetY = this.height - this.barHeight;

    if (this.stackBars) this.stackBars.attr("height", barHeight - (groupBy > 2 ? 1 : 0));

    if (this.sideBars) this.sideBars
      .attr("transform", (d, i) => i ? ("scale(-1,1) translate(" + _this.profileConstants.centerWidth + ",0)") : "");


    //update scales to the new range
    //apply scales to axes and redraw
    this.yScale.range([this.height, 0]);

    const yScaleCopy = this.yScale.copy().domain(domain);
    if (groupBy > 2) {
      yScaleCopy.ticks = () => d3.range(domain[0], domain[1] + 1, groupBy);
    }

    yAxisEl.each(function(d, i) {
      _this.yAxis.scale(yScaleCopy.range([_this.height, 0]))
        .tickSizeInner(-_this.graphWidth[i])
        .tickSizeOuter(0)
        .tickPadding(6)
        .tickSizeMinor(-_this.graphWidth[i], 0)
        .labelerOptions({
          scaleType:  y.scale.type,
          toolMargin: margin,
          limitMaxTickNumber: 19,
          fitIntoScale: "optimistic",
          isPivotAuto: false,
          formatter: _this.localise
        });

      d3.select(this).attr("transform", "translate(" + 0 + ",0)")
        .call(_this.yAxis)
        .classed("vzb-bc-axis-text-hidden", !_this.getYAxisVisibility(i));
    });
    yAxisEl.select(".tick line").classed("vzb-hidden", true);

    const maxRange = _this.twoSided ? ((_this.graphWidth[0] - _this.profileConstants.centerWidth) * 0.5) : _this.graphWidth[0];
    this.xScale.range([0, maxRange]);

    const format = this.ui.inpercent ? d3.format((groupBy > 3 ? ".1" : ".1") + "%") : this.localise;

    const translateX = [];
    xAxisEl.each(function(d, i) {
      const maxRange = _this.twoSided ? ((_this.graphWidth[i] - _this.profileConstants.centerWidth) * 0.5) : _this.graphWidth[i];
      translateX[i] = _this.twoSided ? ((_this.graphWidth[i] + _this.profileConstants.centerWidth) * 0.5) : 0;

      _this.xAxis.scale(_this.xScale.copy().domain(_this.domains[i]).range([0, maxRange]))
        .tickFormat(format)
        .tickSizeInner(-_this.height)
        .tickSizeOuter(0)
        .tickPadding(6)
        .tickSizeMinor(0, 0)
        .labelerOptions({
          scaleType: x.scale.type,
          toolMargin: margin,
          limitMaxTickNumber: 6,
          //formatter: _this.localise
        });

      d3.select(this)
        .attr("transform", "translate(" + translateX[i] + "," + _this.height + ")")
        .call(_this.xAxis);
      const zeroTickEl = d3.select(this).selectAll(".tick text");
      const tickCount = zeroTickEl.size();
      if (tickCount > 0) {
        const zeroTickBBox = zeroTickEl.node().getBBox();
        if (tickCount > 1) {
          d3.select(zeroTickEl.node()).attr("dx", (_this.twoSided ? -_this.profileConstants.centerWidth * 0.5 : 0) - zeroTickBBox.width * 0.5 - zeroTickBBox.x);
        }
        zeroTickEl.classed("vzb-invisible", (_this.graphWidth[i] + margin.between) < zeroTickBBox.width);
      }
    });

    xAxisEl.select(".tick line").classed("vzb-hidden", true);
    xAxisLeftEl.classed("vzb-hidden", !this.twoSided);
    if (this.twoSided) {
      this.xScaleLeft.range([(this.graphWidth[0] - this.profileConstants.centerWidth) * 0.5, 0]);

      xAxisLeftEl.each(function(d, i) {

        _this.xAxisLeft.scale(_this.xScaleLeft.copy().domain(_this.domains[i]).range([(_this.graphWidth[i] - _this.profileConstants.centerWidth) * 0.5, 0]))
          .tickFormat(format)
          .tickSizeInner(-_this.height)
          .tickSizeOuter(0)
          .tickPadding(6)
          .tickSizeMinor(0, 0)
          .labelerOptions({
            scaleType: x.scale.type,
            toolMargin: margin,
            limitMaxTickNumber: 6,
            //formatter: this.localise
          });
        d3.select(this)
          .attr("transform", "translate(0," + _this.height + ")")
          .call(_this.xAxisLeft);
        //hide left axis zero tick
        const tickNodes = d3.select(this).selectAll(".tick").classed("vzb-hidden", false).nodes();
        d3.select(tickNodes[tickNodes.length - 1]).classed("vzb-hidden", true);
      });
    }

    const isRTL = this.services.locale.isRTL();

    bars.attr("transform", (d, i) => "translate(" + translateX[i] + ",0)");
    lockedPaths.attr("transform", (d, i) => "translate(" + translateX[i] + ",0)");
    labels.attr("transform", (d, i) => "translate(" + translateX[i] + ",0)");

    const titleSpace = (i) => (translateX[i] - this.profileConstants.titlesSpacing) < 0 ? _this.profileConstants.centerWidth * 0.5 : _this.profileConstants.titlesSpacing;

    title
      .attr("x", (d, i) => this.twoSided ? translateX[i] - _this.profileConstants.centerWidth * 0.5 - titleSpace(i) : 0)
      .style("text-anchor", this.twoSided ? "end" : "")
      .attr("y", -margin.top * 0.275 - deltaMarginTop)
      .each(function(d, i) {
        _this._textEllipsis.wrap(this, _this.twoSided ? (_this.graphWidth[i] + margin.between - titleSpace(i)) * 0.5 : _this.graphWidth[i] +  margin.between)
      });
    titleRight
      .attr("x", (d, i) => translateX[i] - _this.profileConstants.centerWidth * 0.5 + titleSpace(i))
      .attr("y", -margin.top * 0.275 - deltaMarginTop)
      .each(function(d, i) {
        _this._textEllipsis.wrap(this, (_this.graphWidth[i] + margin.between - titleSpace(i)) * 0.5)
      });
    titleCenter
      .attr("x", (d, i) => this.twoSided ? translateX[i] - _this.profileConstants.centerWidth * 0.5: _this.graphWidth[i] * 0.5)
      .style("text-anchor", "middle")
      .attr("y", (-margin.top - deltaMarginTop)* 0.035 )
      .each(function(d, i) {
        _this._textEllipsis.wrap(this, _this.graphWidth[i] +  margin.between)
      });

    xTitleEl
      .style("font-size", infoElHeight + "px")
      .attr("transform", "translate(" + (isRTL ? margin.left + this.width + margin.right * 0.6 : margin.left * 0.4) + "," + (margin.top * 0.35) + ")");

    if (xInfoEl.select("svg").node()) {
      const titleBBox = xTitleEl.node().getBBox();
      const t = utils.transform(xTitleEl.node());
      const hTranslate = isRTL ? (titleBBox.x + t.translateX - infoElHeight * 1.4) : (titleBBox.x + t.translateX + titleBBox.width + infoElHeight * 0.4);

      xInfoEl.select("svg")
        .attr("width", infoElHeight + "px")
        .attr("height", infoElHeight + "px");
      xInfoEl.attr("transform", "translate("
        + hTranslate + ","
        + (t.translateY - infoElHeight * 0.8) + ")");
    }

    const yearLabelOptions = {
      topOffset: this.services.layout.projector ? 25 : this.services.layout.profile === "small" ? 10 : 15,
      leftOffset: this.services.layout.profile === "small" ? 5 : 10,
      rightOffset: this.services.layout.profile === "small" ? 5 : 10,
      xAlign: isRTL ? "left" : "right",
      yAlign: "top",
      heightRatio: this.services.layout.projector ? 0.5 : 0.5,
      //widthRatio: this.services.layout.profile === "large" ? 3 / 8 : 5 / 10
    };

    //year resized
    this._year
      .setConditions(yearLabelOptions)
      .resizeText(this.fullWidth, margin.top);
    yearLocked.attr("x", this.width + margin.left + margin.right - 10).attr("y", (margin.top - deltaMarginTop) * (this.services.layout.profile === "large" ? 1.27 : 1.27));

  }

  _showLabel(d) {
    const _this = this;
    const formatter = _this.ui.inpercent ? d3.format(".1%") : _this.localise;
    const sideDim = _this.SIDEDIM;
    const ageDim = _this.AGEDIM;
    const stackDim = _this.STACKDIM;
    const shiftedAgeDim = "s_age";
    const left = _this.sideKeys.indexOf(d[sideDim]) > 0;

    let deltaX = 7;
    if (!this.smallMultiples) {
      const hoverBarEl = d3.select(d3.event.target);
      deltaX += +hoverBarEl.attr("x");
    }

    const labelNode = _this.DOM.labels.select(".vzb-bc-label-" + d[shiftedAgeDim]).nodes()[d.i];// + "-" + _this._id);
    const labelEl = d3.select(labelNode);
    labelEl.selectAll(".vzb-bc-age")
      .text(textData => {
        //var total = _this.ui.inpercent ? _this.totalValues[d[sideDim]] : 1;
        let text = _this.stackKeys.length > 1 ? _this.stackItems[d[stackDim]] : textData.text;
        text = _this.twoSided ? text : textData.text + " " + _this.stackItems[d[stackDim]];
        const value = _this.xScale.invert(d["width_"]);
        return text + ": " + formatter(value);
      })
      .attr("x", left ? -this.profileConstants.centerWidth - deltaX : deltaX)
      .attr("dx", 0)
      .classed("vzb-text-left", left);
    labelEl.classed("vzb-prehovered", true);
    const bbox = labelNode.getBBox();
    const transform = _this.DOM.svg.node().getScreenCTM().inverse().multiply(labelNode.getScreenCTM());
    const overDrawLeft = Math.max(-bbox.x - transform.e, 0);
    const overDrawRight = Math.min(_this.fullWidth - bbox.x - bbox.width - transform.e, 0);
    labelEl.selectAll(".vzb-bc-age").attr("dx", overDrawLeft + overDrawRight);
    labelEl.classed("vzb-prehovered", false);
    labelEl.classed("vzb-hovered", true);
  }

  _highlightBars() {
    const _this = this;

    _this.someHighlighted = this.MDL.highlighted.data.filter.any();

    _this.updateBarsOpacity();

    if (!_this.someHighlighted) {
      //hide labels
      _this.DOM.labels.selectAll(".vzb-hovered").classed("vzb-hovered", false);
    }
  }

  updateBarsOpacity(duration) {
    const _this = this;

    const highlightedFilter = this.MDL.highlighted.data.filter;
    const selectedFilter = this.MDL.selected.data.filter;
    this.someSelected = selectedFilter.any();
    this.nonSelectedOpacityZero = false;

    const OPACITY_HIGHLT = 1.0;
    const OPACITY_HIGHLT_DIM = this.ui.opacityHighlightDim;
    const OPACITY_SELECT = 1.0;
    const OPACITY_REGULAR = this.ui.opacityRegular;
    const OPACITY_SELECT_DIM = this.ui.opacitySelectDim;

    const nonSelectedOpacityZero = this.ui.opacitySelectDim < 0.01;
    const nonSelectedOpacityZeroFlag = nonSelectedOpacityZero != this.nonSelectedOpacityZero;
    const someSelected = this.someSelected;
    const someHighlighted = this.someHighlighted;

    this.stackBars.each(function(d) {
      const isSelected =  someSelected ? selectedFilter.has(d) : false;
      const isHighlighted = someHighlighted ? highlightedFilter.has(d): false;
      const bar = d3.select(this);

      bar.style("opacity", isHighlighted ? OPACITY_HIGHLT
        :
        someSelected ? (isSelected ? OPACITY_SELECT : OPACITY_SELECT_DIM)
          :
          someHighlighted ? OPACITY_HIGHLT_DIM : OPACITY_REGULAR)
        .style("stroke", isSelected ? "#333" : null)
        .style("y", isSelected ? "0.5px" : null);

      if(nonSelectedOpacityZeroFlag) {
        bar.style("pointer-events", !someSelected || !nonSelectedOpacityZero || isSelected ? "visible" : "none");
      }
    });

    this.nonSelectedOpacityZero = OPACITY_SELECT_DIM < 0.01;
  }

  getYAxisVisibility(index) {
    return index == 0 ? true : false;
  }

}

// const {
//   utils,
//   Component,
//   helpers: {
//     "d3.axisWithLabelPicker": axisSmart,
//     "d3.dynamicBackground": DynamicBackground,
//     "textEllipsis": TextEllipsis
//   },
//   iconset: {
//     question: iconQuestion
//   },
// } = Vizabi;

// POP BY AGE CHART COMPONENT
const _PopByAge = {

  /**
   * Initializes the component (Bar Chart).
   * Executed once before any template is rendered.
   * @param {Object} config The config passed to the component
   * @param {Object} context The component's parent
   */
  init(config, context) {
    this.name = "popbyage";
    this.template = require("./template.html");

    //define expected models for this component
    this.model_expects = [{
      name: "time",
      type: "time"
    }, {
      name: "marker",
      type: "marker"
    }, {
      name: "entities",
      type: "entities"
    }, {
      name: "entities_side",
      type: "entities"
    }, {
      name: "entities_age",
      type: "entities"
    }, {
      name: "entities_geodomain",
      type: "entities"
    }, {
      name: "locale",
      type: "locale"
    }, {
      name: "ui",
      type: "ui"
    }];

    const _this = this;
    this.model_binds = {
      "change:time.start": function(evt) {
        if (!_this._readyOnce) return;
        _this.updateStartEnd(_this.model.time.value, _this.groupBy);
      },
      "change:time.end": function(evt) {
        if (!_this._readyOnce) return;
        _this.timeSteps = _this.model.time.getAllSteps();
      },
      "change:time.startSelected": function(evt) {
        if (!_this._readyOnce) return;
        _this.timeSteps = _this.model.time.getAllSteps();
        _this.model.time.set({
          startSelected: new Date(_this.timeSteps[0])
        }, false, false);

      },
      "change:time.endSelected": function(evt) {
        if (!_this._readyOnce) return;
        _this.timeSteps = _this.model.time.getAllSteps();
        _this.model.time.set({
          endSelected: new Date(_this.timeSteps[_this.timeSteps.length - 1])
        }, false, false);
      },
      "change:time.value": function(evt) {
        if (!_this._readyOnce) return;
        if (_this.model.time.step != 1 && !_this.snapped && !_this.model.time.playing && !_this.model.time.dragging) {
          if(_this.snapTime) {
            if(+_this.snapTime - _this.model.time.value === 0) {
              _this.snapTime = null;
              _this.model.time.snap();
            } else {
              _this.model.time.value = new Date(_this.snapTime);
            }
            return;
          }
          if(_this.updateStartEnd(_this.model.time.value, _this.groupBy)) {
            _this.ready();
            return;
          };
          let next = d3.bisectLeft(_this.timeSteps, _this.model.time.value);
          if (next != 0 && (_this.timeSteps[next] - _this.model.time.value)) {
            _this.snapped = true;
            const time = _this.model.time.value;
            const prev = _this.timeSteps[next - 1];
            next = _this.timeSteps[next];
            const snapTime = (time - prev) < (next - time) ? prev : next;
            _this.model.time.value = new Date(snapTime);
          }
        }
        if (!_this.snapped) {
          if (_this.timeSteps.filter(t => (t - _this.model.time.value) == 0).length) {
            _this.model.marker.getFrame(_this.model.time.value, frame => {
              if(!frame) return;
              _this.frame = frame;
              _this.frameAxisX = frame.axis_x;
              _this._updateEntities();
              _this.updateBarsOpacity();
            });
          } else if(_this.model.time.value < _this.model.time.startSelected || _this.model.time.value > _this.model.time.endSelected) {
            _this.snapTime = _this.model.time.value;
          } else {
            _this.snapTime = null;
            const nextIndex = d3.bisectLeft(_this.timeSteps, _this.model.time.value);
            const prevFrameTime = _this.timeSteps[nextIndex - 1];
            const nextFrameTime = _this.timeSteps[nextIndex];
            const fraction = (_this.model.time.value - prevFrameTime) / (nextFrameTime - prevFrameTime);
            _this.model.marker.getFrame(nextFrameTime, nValues => {
              _this.model.marker.getFrame(prevFrameTime, pValues => {
                _this.frameAxisX = _this.interpolateDiagonal(pValues.axis_x, nValues.axis_x, fraction);
                _this._updateEntities();
                _this.updateBarsOpacity();
              });
            });
          }
        }
        _this._updateForecastOverlay();
        _this.snapped = false;
      },
      "change:marker.select": function(evt) {
        _this.someSelected = (_this.model.marker.select.length > 0);
        _this.nonSelectedOpacityZero = false;
        _this.updateBarsOpacity();
      },
      "change:marker.highlight": function(evt, path) {
        if (!_this._readyOnce) return;
        _this._highlightBars();
      },
      "change:marker.opacitySelectDim": function() {
        _this.updateBarsOpacity();
      },
      "change:marker.opacityRegular": function() {
        _this.updateBarsOpacity();
      },
      "change:marker.color.palette": function(evt) {
        if (!_this._readyOnce) return;
        _this._updateEntities(true);
      },
      "change:marker.color.scaleType": function(evt) {
        if (!_this._readyOnce) return;
        _this._updateEntities();
      },
      "change:marker.color.which": function(evt) {
        if (!_this._readyOnce) return;
        let stackDim;
        const show = {};
        const entitiesProps = {}
        if (_this.model.marker.color.use == "constant") {
          stackDim = null;
        } else {
          const colorConcept = _this.model.marker.color.getConceptprops();
          if (colorConcept.concept_type == "entity_set") {
            stackDim = colorConcept.domain;
            //show["is--" + _this.model.marker.color.which] = true;
            show[stackDim] = {};
            const sideConcept = _this.model.marker.side.getConceptprops();
            if (sideConcept.concept_type == "entity_set" && stackDim == sideConcept.domain && _this.model.marker.side.which !== _this.model.marker.color.which) {
              _this.model.marker.side.setWhich({"concept" : _this.model.marker.color.which});
            }
          } else {
            stackDim = _this.model.marker.color.which;
          }
        }
        if (_this.STACKDIM !== stackDim) {
          entitiesProps["show"] = show;
        }
        entitiesProps["dim"] = stackDim;
        const skipFilterSide = _this.SIDEDIM !== _this.geoDomainDimension || _this.model.marker.color.which === _this.model.marker.side.which;
        if (!skipFilterSide) {
          const sideShow = {};
          sideShow["is--" + _this.model.marker.side.which] = true;
          _this.model.entities_side.set("show", sideShow);
        }
        _this.model.entities_side.skipFilter = skipFilterSide;
        _this.model.entities.set(entitiesProps);
        _this.model.entities_geodomain.skipFilter = (stackDim === _this.geoDomainDimension || _this.SIDEDIM === _this.geoDomainDimension) &&
          (Boolean(_this.model.entities.getFilteredEntities().length) || !_this.model.entities_side.skipFilter);
        _this.model.entities.set("dim", stackDim);
        _this.model.marker.color.set("which", _this.model.marker.color.which);
      },
      "change:marker.side.which": function(evt) {
        if (!_this._readyOnce) return;
        let sideDim;
        const show = {};
        const entitiesSideProps = {}
        if (_this.model.marker.side.use == "constant") {
          sideDim = null;
        } else {
          const sideConcept = _this.model.marker.side.getConceptprops();
          if (sideConcept.concept_type == "entity_set") {
            sideDim = sideConcept.domain;
            const colorConcept = _this.model.marker.color.getConceptprops();
            if (colorConcept.concept_type == "entity_set" && sideDim == colorConcept.domain && _this.model.marker.color.which !== _this.model.marker.side.which) {
              _this.model.marker.color.setWhich({"concept" : _this.model.marker.side.which});
            }
          } else {
            sideDim = _this.model.marker.side.which;
          }
        }
//        const sideDim = _this.model.marker.side.use == "constant" ? null : _this.model.marker.side.which;
        _this.model.marker.side.clearSideState();
        const skipFilterSide = sideDim !== _this.geoDomainDimension || _this.model.marker.color.which === _this.model.marker.side.which;
        if (!skipFilterSide) {
          show["is--" + _this.model.marker.side.which] = true;
        }
        _this.model.entities_side.skipFilter = skipFilterSide;
        entitiesSideProps["show"] = show;
        entitiesSideProps["dim"] = sideDim;
//        _this.model.entities_side.clearShow();
        _this.model.entities_side.set(entitiesSideProps);
        _this.model.entities_geodomain.skipFilter = (sideDim === _this.geoDomainDimension || _this.STACKDIM === _this.geoDomainDimension) &&
          (Boolean(_this.model.entities.getFilteredEntities().length) || !_this.model.entities_side.skipFilter);
        if(_this.model.marker.color.which === _this.model.marker.side.which) {
          _this.model.entities.clearShow();
        }
      },
      "change:entities.show": function(evt) {
        if (!_this._readyOnce) return;
        if (_this.model.entities.dim === _this.model.entities_side.dim
          && !utils.isEmpty(_this.model.entities_side.show)) {
          const showEntities = _this.model.entities_side.getFilteredEntities().filter(s => !_this.model.entities.isShown(s));
          if (showEntities.length) {
            _this.model.marker.side.clearSideState();
            _this.model.entities_side.showEntity(showEntities);
          }
        }
        _this.model.entities_geodomain.skipFilter = (_this.SIDEDIM === _this.geoDomainDimension || _this.STACKDIM === _this.geoDomainDimension) &&
          (Boolean(_this.model.entities.getFilteredEntities().length) || !_this.model.entities_side.skipFilter);
        _this.lockFrame = null;
      },
      "change:entities_side.show": function(evt) {
        if (!_this._readyOnce) return;

        let doReturn = false;
        let _entitiesSameDimWithSide = null;
        utils.forEach(_this.model.marker.side._space, h => {
          if (h.dim === _this.model.entities_side.dim && h._name !== _this.model.entities_side._name && h._name !== _this.model.entities_geodomain._name) {
            _entitiesSameDimWithSide = h;
          }
        });
        if (_entitiesSameDimWithSide) {
          //_this.model.entities.getFilteredEntities();
          const showEntities = _this.model.entities_side.getFilteredEntities().filter(s => !_entitiesSameDimWithSide.isShown(s));
          if (showEntities.length) {
            _entitiesSameDimWithSide.showEntity(showEntities);
            doReturn = true;
          }
        }
        if (_this.SIDEDIM !== _this.model.entities_side.dim) {
          doReturn = true;
        }
        if (doReturn) return;

        _this._updateIndicators();
        _this._updateSideTitles();

        if (!_this.model._ready || !_this.frame) return;
        if (_this.smallMultiples) {
          utils.forEach(_this.stackKeys, (stackKey, i) => {
            _this._updateLimits(stackKey, i);
          });
        } else {
          _this._updateLimits();
        }
        _this.resize();
        _this._updateEntities(true);
        _this._redrawLocked();
      },
      "change:entities_age.grouping": function(evt) {
        _this.model.marker.clearSelected();
        _this.groupBy = +_this.model.entities_age.grouping || 1;
        _this.model.time.step = _this.groupBy;
        _this.updateStartEnd(_this.model.time.value, _this.groupBy);
        _this.model.ui.chart.lockNonSelected = 0;
        _this.labels.text("");
        _this.model.entities_age.clearShow();
      },
      "change:ui.chart.inpercent": function(evt) {
        if (!_this._readyOnce) return;
        if (_this.smallMultiples) {
          utils.forEach(_this.stackKeys, (stackKey, i) => {
            _this._updateLimits(stackKey, i);
          });
        } else {
          _this._updateLimits();
        }
        _this.resize();
        _this._updateEntities();
        _this._redrawLocked();
      },
      "change:ui.chart.flipSides": function(evt) {
        if (!_this._readyOnce) return;
        _this.model.marker.side.switchSideState();
        _this._updateIndicators();
        _this._updateSideTitles();
        _this.resize();
        _this._updateEntities(true);
        _this._redrawLocked();
      },
      "change:ui.chart.lockNonSelected": function(evt) {
        _this.lock = _this.model.ui.chart.lockNonSelected;
        if (_this.lock) {
          if (!(_this.stackKeys.length <= 1 || _this.stackSkip || _this.smallMultiples)) {
            _this.model.ui.chart.lockNonSelected = 0;
            return;
          }
          _this.yearLocked.text(" " + _this.lock);//🔒
          _this._redrawLocked();
        } else {
          _this.yearLocked.text("");
          _this.lockedPaths.text("");
          _this.lockFrame = null;
        }
      },
      "change:ui.chart.showForecastOverlay": function() {
        if (!_this._readyOnce) return;
        _this._updateForecastOverlay();
      }
    };

    //contructor is the same as any component
    this._super(config, context);

    this.textEllipsis = new TextEllipsis(this);

    this.xScale = null;
    this.yScale = null;
    this.cScale = null;

    this.xAxis = axisSmart("bottom");
    this.xAxisLeft = axisSmart("bottom");
    this.yAxis = axisSmart("left");
    this.xScales = [];
    this.SHIFTEDAGEDIM = "s_age";

  },

  domReady() {
    this._super();
    ////replace code below when IE11 support will be skipped
    // this.graphTemplate = d3.select(this.element)
    //   .select(".vzb-bc-graph")
    //   .html();
    this.graphTemplate = new XMLSerializer().serializeToString(d3.select(this.element).select(".vzb-bc-graph").node());
    ////
  },

  // afterPreload: function() {
  //   var obj = {};
  //   obj["which"] = this.model.marker.axis_x.which;
  //   obj["use"] = this.model.marker.axis_x.use;
  //   this.model.marker_side.hook_total.set(obj);
  // },

  updateStartEnd(time, groupBy) {
    const timeModel = this.model.time;
    const timeYear = timeModel.formatDate(time);
    const startYear = +timeModel.formatDate(timeModel.start);
    const offset = (+timeYear - startYear) % groupBy;
    if (offset !== timeModel.offset) {
      timeModel.set("offset", offset);
      this.timeSteps = timeModel.getAllSteps();
      timeModel.set({
        startSelected: new Date(this.timeSteps[0]),
        endSelected: new Date(this.timeSteps[this.timeSteps.length - 1])
      }, false, false);
      return true;
    }
    return false;
  },

  getTimeOffset(timeModel, groupBy) {
    const startYear = +timeModel.formatDate(timeModel.start);
    const timeYear = +timeModel.formatDate(timeModel.value);
    return (+timeYear - startYear) % groupBy;
  },

  checkDimensions() {
    const stackDim = this.model.entities.dim;
    const sideDim = this.model.entities_side.dim;

    this.colorUseConstant = this.model.marker.color.use == "constant";
    this.stackSkip = this.colorUseConstant || stackDim == sideDim;
    this.geoLess = stackDim !== this.geoDomainDimension && sideDim !== this.geoDomainDimension;
    this.sideSkip = this.model.marker.side.use == "constant";
  },

  /**
   * DOM is ready
   */
  readyOnce() {
    const _this = this;
    this.el = (this.el) ? this.el : d3.select(this.element);
    this.element = this.el;

    this.textEllipsis.setTooltip(this.element.select(".vzb-bc-tooltip"));

    this.interaction = this._interaction();

    this.geoDomainDimension = this.model.entities_geodomain.getDimension();
    this.geoDomainDefaultValue = this.model.entities_geodomain.show[this.geoDomainDimension]["$in"][0];

    this.xTitleEl = this.element.select(".vzb-bc-axis-x-title");
    this.xInfoEl = this.element.select(".vzb-bc-axis-x-info");
    this.yearEl = this.element.select(".vzb-bc-year-now");
    this.year = new DynamicBackground(this.yearEl);
    this.year.setText(this.model.time.formatDate(this.model.time.value));
    this.yearLocked = this.element.select(".vzb-bc-year-locked");

    this.forecastOverlay = this.element.select(".vzb-bc-forecastoverlay");

    this.someSelected = (this.model.marker.select.length > 0);
    this.nonSelectedOpacityZero = false;

    this.groupBy = +this.model.entities_age.grouping || 1;

    this.on("resize", () => {
      _this._updateEntities();
      _this._redrawLocked();
    });

    this._attributeUpdaters = {
      _newWidth(d, i) {
        //d["x_"] = 0;
        let width;
        if (_this.geoLess && _this.stackSkip && _this.sideSkip) {
          width = _this.frameAxisX[`${d[_this.AGEDIM] + _this.ageShift},${_this.geoDomainDefaultValue}`];
        } else if (_this.geoLess && _this.stackSkip) {
          width = _this.colorUseConstant || d[_this.PREFIXEDSIDEDIM] == d[_this.PREFIXEDSTACKDIM] ? _this.frameAxisX[`${d[_this.PREFIXEDSIDEDIM]},${d[_this.AGEDIM] + _this.ageShift},${_this.geoDomainDefaultValue}`] : 0;
        } else if (_this.geoLess && _this.sideSkip) {
          width = _this.frameAxisX[`${d[_this.PREFIXEDSTACKDIM]},${d[_this.AGEDIM] + _this.ageShift},${_this.geoDomainDefaultValue}`];
        } else if (_this.stackSkip) {
          width = _this.colorUseConstant || d[_this.PREFIXEDSIDEDIM] == d[_this.PREFIXEDSTACKDIM] ? _this.frameAxisX[`${d[_this.PREFIXEDSIDEDIM]},${d[_this.AGEDIM] + _this.ageShift}`] : 0;
        } else if (_this.sideSkip) {
          width = _this.frameAxisX[`${d[_this.PREFIXEDSTACKDIM]},${d[_this.AGEDIM] + _this.ageShift}`];
        } else {
          width = _this.frameAxisX[`${d[_this.PREFIXEDSTACKDIM]},${d[_this.PREFIXEDSIDEDIM]},${d[_this.AGEDIM] + _this.ageShift}`];
        }
        d["width_"] = width ? _this.xScale(width) : 0;
        if (_this.ui.chart.inpercent) {
          d["width_"] /= _this.total[d.i][d[_this.PREFIXEDSIDEDIM]];
        }
        return d.width_;
      },
      _newX(d, i) {
        const prevSbl = this.previousSibling;
        if (prevSbl) {
          const prevSblDatum = d3.select(prevSbl).datum();
          d["x_"] = prevSblDatum.x_ + prevSblDatum.width_;
        }
        // else {
        //   d["x_"] = 0;
        // }
        return d.x_;
      }
    };
  },

  /*
   * Both model and DOM are ready
   */
  ready() {
    //TODO: get component ready if some submodel doesn't ready ??????
    if (!this.model.marker._ready) return;

    const _this = this;

    this.lock = _this.model.ui.chart.lockNonSelected;

    this.timeSteps = this.model.time.getAllSteps();

    if (this.groupBy !== 1 && this.lock && !this.lockFrame && !this.model.time.splash ) {
      const lockTime = this.model.time.parse("" + this.lock);
      if (!this.timeSteps.some(time => !(lockTime - time))) {
        this.timeSaved = this.model.time.value;
        this.model.time.set({
          startSelected: new Date(lockTime),
          endSelected: new Date(lockTime)
        }, false, false);
        return;
      }
    }

    this.shiftScale = d3.scaleLinear()
      .domain([this.timeSteps[0], this.timeSteps[this.timeSteps.length - 1]])
      .range([0, this.timeSteps.length - 1]);

    this.domains = [];

    this.SIDEDIM = this.model.entities_side.getDimension();
    this.PREFIXEDSIDEDIM = "side_" + this.SIDEDIM;
    this.STACKDIM = this.model.entities.getDimension();// || this.geoDomainDimension;//this.model.marker.color.which;
    this.PREFIXEDSTACKDIM = "stack_" + this.STACKDIM;
    this.AGEDIM = this.model.entities_age.getDimension();
    this.TIMEDIM = this.model.time.getDimension();
    this.checkDimensions();
    this.updateUIStrings();
    this._updateIndicators();
    this.smallMultiples = (this.model.ui.chart || {}).mode === "smallMultiples" && !this.stackSkip && this.stackKeys.length > 1 ? true : false;
    this._updateGraphs(this.smallMultiples ? this.stackKeys : ["undefined"]);
    this._updateSideTitles();
    this._updateForecastOverlay();

    if (this.lock && (this.stackKeys.length <= 1 || this.stackSkip || this.smallMultiples)) {
      this.yearLocked.text("" + this.lock);
    } else {
      _this.model.ui.chart.lockNonSelected = 0;
    }
    this.model.ui.chart.set("lockUnavailable", !(this.stackKeys.length <= 1 || this.stackSkip || this.smallMultiples), false, false);

    this.frame = null;

    this.model.marker.getFrame(_this.model.time.value, (frame, time) => {
      _this.frame = frame;
      _this.frameAxisX = frame.axis_x;
      _this.frameColor = frame.color;

      const frames = {};
      frames[time] = frame;
      _this.maxLimits = {};
      _this.inpercentMaxLimits = {};
      _this.totals = {};

      if (_this.smallMultiples) {
        utils.forEach(_this.stackKeys, (stackKey, i) => {
          _this._createLimits(frames, stackKey);
          _this._updateLimits(stackKey, i);
        });
      } else {
        _this._createLimits(frames);
        _this._updateLimits();
      }

      if (_this.timeSaved) {
        if (_this.timeSaved - _this.model.time.value !== 0) {
          _this.lockFrame = {
            axis_x: _this.frameAxisX
          };
          _this.lockTotal = _this._updateTotal(_this.model.time.value);
          const timeSaved = _this.timeSaved;
          _this.timeSaved = null;
          _this.model.time.set({
            startSelected: new Date(timeSaved),
            endSelected: new Date(timeSaved)
          }, false, false);
        }
        return;
      }

      _this._getLimits();

      _this.resize();
      _this._updateEntities(true);
      _this.updateBarsOpacity();
        //_this._redrawLocked();
        //_this.model.time.set('value', _this.model.time.value, true, true);
    });

  },

  _updateGraphs(data) {
    const _this = this;
    const graph = this.element.selectAll(".vzb-bc-graph").data(data)
    graph.exit().remove();
    ////replace code below when IE11 support will be skipped
    //  graph.enter().append("g")
    //   .attr("class", "vzb-bc-graph")
    //   .html(this.graphTemplate);
    graph.enter().append(function() {
      return this.ownerDocument.importNode(
        new DOMParser().parseFromString(_this.graphTemplate, 'application/xml').documentElement, true);
    });
    ////

    this.element.select(".vzb-bc-tooltip").raise();
    this.graph = this.element.selectAll(".vzb-bc-graph");
    this.yAxisEl = this.graph.select(".vzb-bc-axis-y");
    this.xAxisEl = this.graph.select(".vzb-bc-axis-x");
    this.xAxisLeftEl = this.graph.select(".vzb-bc-axis-x-left");
    this.yTitleEl = this.graph.select(".vzb-bc-axis-y-title");
    this.title = this.graph.select(".vzb-bc-title");
    this.titleRight = this.graph.select(".vzb-bc-title-right");
    this.titleCenter = this.graph.select(".vzb-bc-title-center");
    this.barsCrop = this.graph.select(".vzb-bc-bars-crop");
    this.lockedCrop = this.graph.select(".vzb-bc-locked-crop");
    this.labelsCrop = this.graph.select(".vzb-bc-labels-crop");
    this.bars = this.barsCrop.select(".vzb-bc-bars");
    this.lockedPaths = this.lockedCrop.select(".vzb-bc-paths");
    this.labels = this.labelsCrop.select(".vzb-bc-labels");
  },

  _getLimits() {
    const _this = this;
    return function() {
      const groupBy = _this.groupBy;
      _this.model.marker.getFrame(null, frames => {
        if(!frames || groupBy !== _this.groupBy) return;
        const fullFrames = _this.groupBy !== 1 && _this.lock && _this.lockFrame ? Object.assign({ [_this.model.time.parse("" + _this.lock)]: _this.lockFrame }, frames) : frames;
        if (_this.smallMultiples) {
          utils.forEach(_this.stackKeys, (stackKey, i) => {
            _this._createLimits(fullFrames, stackKey);
            _this._updateLimits(stackKey, i);
          });
        } else {
          _this._createLimits(fullFrames);
          _this._updateLimits();
        }
        _this.resize();
        _this._updateEntities(true);
        _this.updateBarsOpacity();
        _this._redrawLocked();
      });
    }();
  },

  _redrawLocked() {
    const _this = this;
    if (!this.lock) return;
    if (this.lockFrame) {
      this._makeOutlines(this.lockFrame.axis_x, this.lockTotal);
    } else {
      const lockTime = this.model.time.parse("" + this.lock);

      this.model.marker.getFrame(lockTime, lockFrame => {
        if (!lockFrame) return;
        _this.lockedPaths.text("");
        this.lockFrame = {
          axis_x: lockFrame.axis_x
        };
        this.lockTotal = this._updateTotal(lockTime);
        this._makeOutlines(lockFrame.axis_x, this.lockTotal);
      });
    }
  },

  interpolateDiagonal(pValues, nValues, fraction) {
    const _this = this;
    const data = {};
    let val1, val2, shiftedAge, nKey, pKey;
    const groupBy = this.groupBy;
    const geoDefault = this.geoDomainDefaultValue;

    if (this.geoLess && this.stackSkip && this.sideSkip) {
      utils.forEach(_this.ageKeys, age => {
        shiftedAge = +age + groupBy;
        pKey = age + "," + geoDefault;
        nKey = shiftedAge + "," + geoDefault;
        val1 = pValues[pKey];
        val2 = nValues[nKey] || 0;
        data[nKey] = (val1 == null || val2 == null) ? null : val1 + ((val2 - val1) * fraction);
      });
      nKey = 0 + "," + geoDefault;
      data[nKey] = nValues[nKey] || 0;
    } else if (this.stackSkip && this.geoLess) {
      utils.forEach(_this.sideKeys, side => {
        utils.forEach(_this.ageKeys, age => {
          shiftedAge = +age + groupBy;
          pKey = side + "," + age + "," + geoDefault;
          nKey = side + "," + shiftedAge + "," + geoDefault;
          val1 = pValues[pKey];
          val2 = nValues[nKey] || 0;
          data[nKey] = (val1 == null || val2 == null) ? null : val1 + ((val2 - val1) * fraction);
        });
        nKey = side + "," + 0 + "," + geoDefault;
        data[nKey] = nValues[nKey] || 0;
      });
    } else if (this.stackSkip) {
      utils.forEach(_this.sideKeys, side => {
        utils.forEach(_this.ageKeys, age => {
          shiftedAge = +age + groupBy;
          pKey = side + "," + age;
          nKey = side + "," + shiftedAge;
          val1 = pValues[pKey];
          val2 = nValues[nKey] || 0;
          data[nKey] = (val1 == null || val2 == null) ? null : val1 + ((val2 - val1) * fraction);
        });
        nKey = side + "," + 0;
        data[nKey] = nValues[nKey] || 0;
      });
    } else if (this.sideSkip && this.geoLess) {
      utils.forEach(_this.stackKeys, stack => {
        utils.forEach(_this.ageKeys, age => {
          shiftedAge = +age + groupBy;
          pKey = stack + "," + age + "," + geoDefault;
          nKey = stack + "," + shiftedAge + "," + geoDefault;
          val1 = pValues[pKey];
          val2 = nValues[nKey] || 0;
          data[nKey] = (val1 == null || val2 == null) ? null : val1 + ((val2 - val1) * fraction);
        });
        nKey = stack + "," + 0 + "," + geoDefault;
        data[nKey] = nValues[nKey] || 0;
      });
    } else if (this.sideSkip) {
      utils.forEach(_this.stackKeys, stack => {
        utils.forEach(_this.ageKeys, age => {
          shiftedAge = +age + groupBy;
          pKey = stack + "," + age;
          nKey = stack + "," + shiftedAge;
          val1 = pValues[pKey];
          val2 = nValues[nKey] || 0;
          data[nKey] = (val1 == null || val2 == null) ? null : val1 + ((val2 - val1) * fraction);
        });
        nKey = stack + "," + 0;
        data[nKey] = nValues[nKey] || 0;
      });
    } else {
      utils.forEach(_this.stackKeys, stack => {
        utils.forEach(_this.sideKeys, side => {
          utils.forEach(_this.ageKeys, age => {
            shiftedAge = +age + groupBy;
            pKey = stack + "," + side + "," + age;
            nKey = stack + "," + side + "," + shiftedAge;
            val1 = pValues[pKey];
            val2 = nValues[nKey] || 0;
            data[nKey] = (val1 == null || val2 == null) ? null : val1 + ((val2 - val1) * fraction);
          });
          nKey = stack + "," + side + "," + 0;
          data[nKey] = nValues[nKey] || 0;
        });
      });
    }
    return data;
  },

  updateUIStrings() {
    const _this = this;
    this.localise = this.model.locale.getTFunction();

    const xTitle = this.xTitleEl.select("text").text(_this.translator("popbyage/title"));

    const conceptPropsX = this.model.marker.axis_x.getConceptprops();
    utils.setIcon(this.xInfoEl, iconQuestion)
      .select("svg").attr("width", "0px").attr("height", "0px")
      .style('opacity', Number(Boolean(conceptPropsX.description || conceptPropsX.sourceLink)));

    this.xInfoEl.on("click", () => {
      _this.parent.findChildByName("gapminder-datanotes").pin();
    });
    this.xInfoEl.on("mouseover", function() {
      if (_this.model.time.dragging) return;
      const rect = this.getBBox();
      const coord = utils.makeAbsoluteContext(this, this.farthestViewportElement)(rect.x - 10, rect.y + rect.height + 10);
      const toolRect = _this.root.element.getBoundingClientRect();
      const chartRect = _this.element.node().getBoundingClientRect();
      _this.parent.findChildByName("gapminder-datanotes").setHook("axis_x").show().setPos(coord.x + chartRect.left - toolRect.left, coord.y);
    });
    this.xInfoEl.on("mouseout", () => {
      if (_this.model.time.dragging) return;
    _this.parent.findChildByName("gapminder-datanotes").hide();
  });

    // var titleStringY = this.model.marker.axis_y.getConceptprops().name;

    // var yTitle = this.yTitleEl.selectAll("text").data([0]);
    // yTitle.enter().append("text");
    // yTitle
    //   .attr("y", "-6px")
    //   .attr("x", "-9px")
    //   .attr("dx", "-0.72em")
    //   .text(titleStringY);
  },

  /**
   * Changes labels for indicators
   */
  _updateIndicators() {
    const {
      frame,
      x,
      y,
      side
    } = this.MDL;


    const _this = this;
    this.duration = frame.speed;
    this.yScale = y.scale.d3Scale;
    this.xScale = x.scale.d3Scale;
    this.yAxis.tickFormat(_this.model.marker.axis_y.getTickFormatter());
    this.xAxis.tickFormat(_this.model.marker.axis_x.getTickFormatter());
    this.xAxisLeft.tickFormat(_this.model.marker.axis_x.getTickFormatter());

    const sideDim = this.SIDEDIM;
    const stackDim = this.STACKDIM;
    const ageDim = this.AGEDIM;
    const groupBy = this.groupBy;

    // const ages = this.model.marker.getKeys(ageDim);
    // let ageKeys = [];
    // ageKeys = ages.map(m => m[ageDim]);
    //this.ageKeys = ageKeys;
    this.ageKeys =

    this.shiftedAgeKeys = this.timeSteps.map((m, i) => -i * groupBy).slice(1).reverse().concat(ageKeys);

    this.sideItems = this.model.marker.label_side.getItems(true);
    //var sideKeys = Object.keys(sideItems);
    let sideKeys = [];
    if (!utils.isEmpty(this.sideItems)) {
      const sideFiltered = !!this.model.marker.side.getEntity().show[sideDim];
      const sides = this.model.marker.getKeys(sideDim)
          .filter(f => !sideFiltered || this.model.marker.side.getEntity().isShown(f));
      sideKeys = sides.map(m => m[sideDim]);

      if (sideKeys.length > 2) sideKeys.length = 2;
      if (sideKeys.length > 1) {
        const sortFunc = this.ui.chart.flipSides ? d3.ascending : d3.descending;
        sideKeys.sort(sortFunc);
      }
    }
    if (!sideKeys.length) sideKeys.push("undefined");
    this.sideKeys = sideKeys;

    const stacks = this.model.marker.getKeys(stackDim);
    const stackKeys = stacks.map(m => m[stackDim]);

    let sortedStackKeys = utils.keys(this.model.marker.color.getPalette()).reduce((arr, val) => {
        if (stackKeys.indexOf(val) != -1) arr.push(val);
        return arr;
      }, []);

    if (sortedStackKeys.length != stackKeys.length) {
      sortedStackKeys = stackKeys.reduce((arr, val) => {
          if (arr.indexOf(val) == -1) arr.push(val);
          return arr;
        }, sortedStackKeys);
    }
    this.stackKeys = sortedStackKeys;
    this.stackItems = this.model.marker.label_stack.getItems();

    this.stacked = this.ui.chart.stacked && this.model.marker.color.use != "constant" && this.model.entities.getDimension();

    this.twoSided = this.sideKeys.length > 1;
    if (this.twoSided) {
      this.xScaleLeft = this.xScale.copy();
    }

    this.cScale = this.model.marker.color.getScale();

    this.markers = this.model.marker.getKeys(ageDim).sort((a,b) => d3.ascending(+a[ageDim], +b[ageDim]));
  },

  _updateForecastOverlay() {
    this.forecastOverlay.classed("vzb-hidden", (this.model.time.value <= this.model.time.endBeforeForecast) || !this.model.time.endBeforeForecast || !this.model.ui.chart.showForecastOverlay);
  },

  _updateSideTitles() {
    const _this = this;
    const sideItems = this.sideItems;

    this.titleRight.classed("vzb-hidden", !this.twoSided);
    if (this.twoSided) {
      this.title.text(sideItems[this.sideKeys[1]]).call(this.textEllipsis.clear);
      this.titleRight.text(sideItems[this.sideKeys[0]]).call(this.textEllipsis.clear);;
    } else {
      const title = this.sideKeys.length && sideItems[this.sideKeys[0]] ? sideItems[this.sideKeys[0]] : "";
      this.title.text(title).call(this.textEllipsis.clear);;
    }

    if (this.smallMultiples) {
      this.titleCenter.call(this.textEllipsis.clear).each(function(d, i) {
        d3.select(this).text(_this.stackItems[_this.stackKeys[i]]);
      });
    } else {
      const title = this.stackKeys.length && this.stackItems[this.stackKeys[0]] && !this.stackSkip ? this.stackItems[this.stackKeys[0]] : "";
      this.titleCenter.text(title).call(this.textEllipsis.clear);
    }
  },

  _createLimits(frames, stackKey) {
    const _this = this;

    const stackKeys = stackKey ? [stackKey] : this.stackKeys;
    //const sideKeysNF = Object.keys(this.model.marker.side.getItems());
    const sideKeysNF = Object.keys(this.model.marker.side.getNestedItems([this.SIDEDIM]));
    if (!sideKeysNF.length) sideKeysNF.push("undefined");

    const totals = {};
    const inpercentMaxLimits = {};
    const maxLimits = {};
    const geoDefault = this.geoLess ? "," + this.geoDomainDefaultValue : "";
    let key;
    sideKeysNF.forEach(s => {
      maxLimits[s] = [];
      inpercentMaxLimits[s] = [];
    });

    if (_this.stackSkip && _this.sideSkip) {
      utils.forEach(frames, (f, time) => {
        const frame = f.axis_x;
        totals[time] = {};
        let ageSum = 0;
        const sideMaxLimits = [];
        utils.forEach(_this.ageKeys, age => {
          let stackSum = 0;
          key = age + geoDefault;
          if (frame[key]) {
            stackSum += frame[key];
            ageSum += stackSum;
          }
          sideMaxLimits.push(stackSum);
        });
        totals[time][sideKeysNF[0]] = ageSum;
        const maxSideLimit = Math.max(...sideMaxLimits);
        inpercentMaxLimits[sideKeysNF[0]].push(maxSideLimit / ageSum);
        maxLimits[sideKeysNF[0]].push(maxSideLimit);
      });
    } else if (_this.sideSkip) {
      utils.forEach(frames, (f, time) => {
        const frame = f.axis_x;
        totals[time] = {};
        let ageSum = 0;
        const sideMaxLimits = [];
        utils.forEach(_this.ageKeys, age => {
          let stackSum = 0;
          utils.forEach(stackKeys, stack => {
            key = stack + "," + age + geoDefault;
            if (frame[key]) {
              stackSum += frame[key];
              ageSum += stackSum;
            }
          });
          sideMaxLimits.push(stackSum);
        });
        totals[time][sideKeysNF[0]] = ageSum;
        const maxSideLimit = Math.max(...sideMaxLimits);
        inpercentMaxLimits[sideKeysNF[0]].push(maxSideLimit / ageSum);
        maxLimits[sideKeysNF[0]].push(maxSideLimit);
      });
    } else if (_this.stackSkip) {
      utils.forEach(frames, (f, time) => {
        const frame = f.axis_x;
        totals[time] = {};
        utils.forEach(sideKeysNF, side => {
          let ageSum = 0;
          const sideMaxLimits = [];
          utils.forEach(_this.ageKeys, age => {
            let stackSum = 0;
            key = side + "," + age + geoDefault;
            if (frame[key]) {
              stackSum += frame[key];
              ageSum += stackSum;
            }
            sideMaxLimits.push(stackSum);
          });
          totals[time][side] = ageSum;
          const maxSideLimit = Math.max(...sideMaxLimits);
          inpercentMaxLimits[side].push(maxSideLimit / ageSum);
          maxLimits[side].push(maxSideLimit);
        });
      });
    } else {
      utils.forEach(frames, (f, time) => {
        const frame = f.axis_x;
        totals[time] = {};
        utils.forEach(sideKeysNF, side => {
          let ageSum = 0;
          const sideMaxLimits = [];
          utils.forEach(_this.ageKeys, age => {
            let stackSum = 0;
            utils.forEach(stackKeys, stack => {
              key = stack + "," + side + "," + age + geoDefault;
              if (frame[key]) {
                stackSum += frame[key];
                ageSum += stackSum;
              }
            });
            sideMaxLimits.push(stackSum);
          });
          totals[time][side] = ageSum;
          const maxSideLimit = Math.max(...sideMaxLimits);
          inpercentMaxLimits[side].push(maxSideLimit / ageSum);
          maxLimits[side].push(maxSideLimit);
        });
      });
    }

    if (stackKey) {
      this.maxLimits[stackKey] = {};
      this.inpercentMaxLimits[stackKey] = {};
      sideKeysNF.forEach(s => {
        _this.maxLimits[stackKey][s] = Math.max(...maxLimits[s]);
        _this.inpercentMaxLimits[stackKey][s] = Math.max(...inpercentMaxLimits[s]);
      });
      this.totals[stackKey] = totals;
    } else {
      sideKeysNF.forEach(s => {
        _this.maxLimits[s] = Math.max(...maxLimits[s]);
        _this.inpercentMaxLimits[s] = Math.max(...inpercentMaxLimits[s]);
      });
      this.totals = totals;
    }
  },

  _updateLimits(stackKey, i) {
    const _this = this;
    const axisX = this.model.marker.axis_x;
    if (this.smallMultiples && stackKey) {
      if (this.ui.chart.inpercent) {
        this.domains[i] = [0, Math.max(...this.sideKeys.map(s => _this.inpercentMaxLimits[stackKey][s]))];
      } else {
        this.domains[i] = (axisX.domainMin != null && axisX.domainMax != null) ? [+axisX.domainMin, +axisX.domainMax] : [0, Math.max(...this.sideKeys.map(s => _this.maxLimits[stackKey][s]))];
      }
    } else {
      if (this.ui.chart.inpercent) {
        this.domains[0] = [0, Math.max(...this.sideKeys.map(s => _this.inpercentMaxLimits[s]))];
      } else {
        this.domains[0] = (axisX.domainMin != null && axisX.domainMax != null) ? [+axisX.domainMin, +axisX.domainMax] : [0, Math.max(...this.sideKeys.map(s => _this.maxLimits[s]))];
      }
    }

    this.xScale.domain(this.domains[0]);
    if (this.xScaleLeft) this.xScaleLeft.domain(this.xScale.domain());

    this.domainScalers = this._calcDomainScalers();
  },

  _calcDomainScalers() {
    const domain = this.domains.map(m => m[1] - m[0])
    const sumDomains = domain.reduce((a, b) => a + b);
    return domain.map(d => d / sumDomains);
  },

  _interpolateBetweenTotals(timeSteps, totals, time) {
    const nextStep = d3.bisectLeft(timeSteps, time);
    const fraction = (time - timeSteps[nextStep - 1]) / (timeSteps[nextStep] - timeSteps[nextStep - 1]);
    const total = {};
    utils.forEach(this.sideKeys, side => {
      total[side] = totals[timeSteps[nextStep]][side] * fraction + totals[timeSteps[nextStep - 1]][side] * (1 - fraction);
  });
    return total;
  },

  _updateTotal(time) {
    const total = {};
    if (this.smallMultiples) {
      utils.forEach(this.stackKeys, (stackKey, i) => {
        total[i] = this.totals[stackKey][time] ? this.totals[stackKey][time] : this._interpolateBetweenTotals(this.timeSteps, this.totals[stackKey], time);
      });
    } else {
      total[0] = this.totals[time] ? this.totals[time] : this._interpolateBetweenTotals(this.timeSteps, this.totals, time);
    }
    return total;
  },

  /**
   * Updates entities
   */
  _updateEntities(reorder) {

    const _this = this;
    const time = this.MDL.frame;
    const sideDim = this.SIDEDIM;
    const prefixedSideDim = this.PREFIXEDSIDEDIM;
    const ageDim = this.AGEDIM;
    const stackDim = this.STACKDIM;
    const prefixedStackDim = this.PREFIXEDSTACKDIM;
    const timeDim = this.TIMEDIM;
    const duration = (time.playing) ? time.delayAnimations : 0;
    const groupBy = this.groupBy;
    //var group_offset = this.model.marker.group_offset ? Math.abs(this.model.marker.group_offset % groupBy) : 0;

    if (this.ui.chart.inpercent) {
      this.total = this._updateTotal(time.value);
    }

    const domain = this.yScale.domain();

    //this.model.age.setVisible(markers);

    const nextStep = d3.bisectLeft(this.timeSteps, time.value);

    const shiftedAgeDim = this.SHIFTEDAGEDIM;

    const markers = this.markers.map(data => {
        const o = {};
    o[ageDim] = o[shiftedAgeDim] = +data[ageDim];
    o[ageDim] -= nextStep * groupBy;
    return o;
  });

    const ageData = markers.slice(0);

    const outAge = {};
    outAge[shiftedAgeDim] = markers.length * groupBy;
    outAge[ageDim] = outAge[shiftedAgeDim] - nextStep * groupBy;

    this.ageShift = nextStep * groupBy;

    if (nextStep) ageData.push(outAge);

    const stacks = _this.stacked ? _this.stackKeys : [_this.geoDomainDefaultValue];
    const geoDomainDefaultValue = this.geoDomainDefaultValue;
    const geoDomainDimension = this.geoDomainDimension;

    // for(let i = 0, j = ageData.length; i < j; i++) {
    //   const d = ageData[i];
    //   d["side"] = _this.sideKeys.map(m => {
    //     const r = {};
    //     r[ageDim] = d[ageDim];
    //     r[shiftedAgeDim] = d[shiftedAgeDim];
    //     r[prefixedSideDim] = m;
    //     r[sideDim] = m;
    //     r["stack"] = stacks.map(m => {
    //       const s = {};
    //       s[geoDomainDimension] = geoDomainDefaultValue;
    //       s[ageDim] = r[ageDim];
    //       s[shiftedAgeDim] = r[shiftedAgeDim];
    //       s[sideDim] = r[sideDim];
    //       s[stackDim] = m;
    //       s[prefixedSideDim] = r[prefixedSideDim];
    //       s[prefixedStackDim] = m;
    //       s["x_"] = 0;
    //       s["width_"] = 0;
    //       return s;
    //     });
    //     return r;
    //   });
    // }

    //this.barsData = ageData;
    this.barsData = [];
    let ageBars = this.bars.selectAll(".vzb-bc-bar")
      .data((d, i) => (_this.barsData[i] = ageData.map(m => {
        const p = {};
        p[ageDim] = m[ageDim];
        p[shiftedAgeDim] = m[shiftedAgeDim];
        p.i = i;
        return p;
      }), this.barsData[i]), d => d[ageDim]);
    //exit selection
    ageBars.exit().remove();

    const oneBarHeight = this.oneBarHeight;
    const barHeight = this.barHeight;
    const firstBarOffsetY = this.firstBarOffsetY;

    //enter selection -- init bars
    ageBars = ageBars.enter().append("g")
      .attr("class", d => "vzb-bc-bar " + "vzb-bc-bar-" + d[ageDim])
      .attr("transform", (d, i) => "translate(0," + (firstBarOffsetY - (d[shiftedAgeDim] - domain[0] - groupBy) * oneBarHeight) + ")")
      .merge(ageBars);

    // this.ageBars.attr("class", function(d) {
    //     return "vzb-bc-bar " + "vzb-bc-bar-" + d[ageDim];
    //   })


    let sideBars = ageBars.selectAll(".vzb-bc-side").data((d, i) => (d.side = _this.sideKeys.map(m => {
      const r = {};
      r[ageDim] = d[ageDim];
      r[shiftedAgeDim] = d[shiftedAgeDim];
      r[prefixedSideDim] = m;
      r[sideDim] = m;
      r.i = d.i;
      return r;
    }), d.side), d => d[prefixedSideDim]);

    sideBars.exit().remove();
    sideBars = sideBars.enter().append("g")
      .attr("class", (d, i) => "vzb-bc-side " + "vzb-bc-side-" + (!i != !_this.twoSided ? "right" : "left"))
      .attr("transform", (d, i) => i ? ("scale(-1,1) translate(" + _this.activeProfile.centerWidth + ",0)") : "")
      .merge(sideBars);

    if (reorder) {
      sideBars
        .attr("class", (d, i) => "vzb-bc-side " + "vzb-bc-side-" + (!i != !_this.twoSided ? "right" : "left"))
        .attr("transform", (d, i) => i ? ("scale(-1,1) translate(" + _this.activeProfile.centerWidth + ",0)") : "");
    }

    const _attributeUpdaters = this._attributeUpdaters;

    let stackBars = sideBars.selectAll(".vzb-bc-stack").data(d => ( d.stack = (_this.smallMultiples ? [stacks[d.i]] : stacks).map(m => {
      const s = {};
      s[geoDomainDimension] = geoDomainDefaultValue;
      s[ageDim] = d[ageDim];
      s[shiftedAgeDim] = d[shiftedAgeDim];
      s[sideDim] = d[sideDim];
      s[stackDim] = m;
      s[prefixedSideDim] = d[prefixedSideDim];
      s[prefixedStackDim] = m;
      s["x_"] = 0;
      s["width_"] = 0;
      s.i = d.i;
      return s;
    }), d.stack), d => d[prefixedStackDim]);

    stackBars.exit().remove();
    stackBars = stackBars.enter().append("rect")
      .attr("class", (d, i) => "vzb-bc-stack " + "vzb-bc-stack-" + i + (_this.highlighted ? " vzb-dimmed" : ""))
      .attr("y", 0)
      .attr("height", barHeight - (groupBy > 2 ? 1 : 0))
      .attr("fill", d => _this.cScale(_this.frameColor[d[prefixedStackDim]] || d[prefixedStackDim]))
      //.attr("width", _attributeUpdaters._newWidth)
      .attr("x", _attributeUpdaters._newX)
      .on("mouseover", _this.interaction.mouseover)
      .on("mouseout", _this.interaction.mouseout)
      .on("click", _this.interaction.click)
      .onTap(_this.interaction.tap)
      .merge(stackBars);


    if (reorder) stackBars
      .attr("class", (d, i) => "vzb-bc-stack " + "vzb-bc-stack-" + i + (_this.highlighted ? " vzb-dimmed" : ""))
      .attr("fill", d => _this.cScale(_this.frameColor[d[prefixedStackDim]] || d[prefixedStackDim]))
      .order();

    const stepShift = (ageData[0][shiftedAgeDim] - ageData[0][ageDim]) - this.shiftScale(time.value) * groupBy;

    if (duration) {
      const transition = d3.transition()
        .duration(duration)
        .ease(d3.easeLinear);

      ageBars
        .transition(transition)
        .attr("transform", (d, i) => "translate(0," + (firstBarOffsetY - (d[shiftedAgeDim] - domain[0] - stepShift) * oneBarHeight) + ")");
      stackBars
        .transition(transition)
        .attr("width", _attributeUpdaters._newWidth)
        .attr("x", _attributeUpdaters._newX);
    } else {
      ageBars.interrupt()
        .attr("transform", (d, i) => "translate(0," + (firstBarOffsetY - (d[shiftedAgeDim] - domain[0] - stepShift) * oneBarHeight) + ")");
      stackBars.interrupt()
        .attr("width", _attributeUpdaters._newWidth)
        .attr("x", _attributeUpdaters._newX);
    }

    this.ageBars = ageBars;
    this.sideBars = sideBars;
    this.stackBars = stackBars;

    this.entityLabels = this.labels.selectAll(".vzb-bc-label text")
      .data(markers);
    //exit selection
    this.entityLabels.exit().remove();

    this.entityLabels = this.entityLabels.enter().append("g")
      .attr("class", d => "vzb-bc-label" + " vzb-bc-label-" + d[shiftedAgeDim])
      .append("text")
      .attr("class", "vzb-bc-age")
      .merge(this.entityLabels)
      .each((d, i) => {
        const yearOlds = _this.translator("popbyage/yearOlds");

        let age = parseInt(d[shiftedAgeDim], 10);

        if (groupBy > 1) {
          const nextAge = (age + groupBy - 1);
          age = age + "-to-" + (nextAge > domain[1] ? domain[1] : nextAge);
        }

        d["text"] = age + yearOlds;
      })
      .attr("y", (d, i) => firstBarOffsetY - (d[shiftedAgeDim] - domain[0]) * oneBarHeight - 10)
      .attr("dy", (d, i) => (d[shiftedAgeDim] + groupBy) > domain[1] ? (groupBy - domain[1] + d[shiftedAgeDim]) / groupBy * barHeight : 0);
    // .style("fill", function(d) {
    //   var color = _this.cScale(values.color[d[ageDim]]);
    //   return d3.rgb(color).darker(2);
    // });

    this.year.setText(this.model.time.formatDate(time.value), this.duration);
  },

  _makeOutlines(frame, total) {
    const _this = this;

    const KEYS = utils.unique(this.model.marker._getAllDimensions({ exceptType: "time" }))
    KEYS.forEach((key, i) => {
        if (key === _this.AGEDIM) KEYS[i] = _this.SHIFTEDAGEDIM;
        //if (_this.geoLess)
      });

    const groupBy = this.groupBy;
    const barHeight = this.barHeight;
    const firstBarOffsetY = this.firstBarOffsetY + barHeight;

    const line = d3.line().curve(d3.curveStepBefore)
      .x(d => d.x)//_ + d.width_)
      .y((d, i) => firstBarOffsetY - barHeight * i  - (groupBy > 2 ? 1 : 0));


    const pathsData = this.barsData.map((barsData, _i) => {
      const stackIndex = [0, 0];

      return this.sideKeys.map((s, i) => {
        if (_this.stackSkip) {
          barsData[0].side[i].stack.forEach((d, j) => {
            if (d[_this.PREFIXEDSIDEDIM] === d[_this.PREFIXEDSTACKDIM]) {
              stackIndex[i] = j;
            }
          });
        }
        const data = {};
        data.d = barsData.map(age => {
          const r = {};
          const x = frame[utils.getKey(age.side[i].stack[stackIndex[i]], KEYS)];
          r.x = x ? _this.xScale(x) : 0;
            if (_this.ui.chart.inpercent) {
              r.x /= total[_i][age.side[i].stack[stackIndex[i]][_this.PREFIXEDSIDEDIM]];
            }
          return r;
        });
        return data;
      });
    });

    const data = this.bars.selectAll(".vzb-bc-side-left").selectAll(".vzb-bc-stack-0").data();
    const color = _this.cScale(data[0][this.PREFIXEDSTACKDIM])
    const colorShade = this.model.marker.color.getColorShade({
      colorID: _this.frameColor[data[0][this.PREFIXEDSTACKDIM]] || data[0][this.PREFIXEDSTACKDIM],
      shadeID: "shade"
    }) || "#000";//d3.hsl(color).darker(2);

    this.lockedPaths.each(function(d, _i) {
      const paths = d3.select(this).selectAll("path").data(pathsData[_i]);
      paths.exit().remove();
      paths.enter()
        .append("path")
        .merge(paths)
        .attr("d", (d, i) => line(d.d))
        .attr("stroke", "#000")//colorShade)
        .attr("transform", (d, i) => i ? ("scale(-1,1) translate(" + _this.activeProfile.centerWidth + ",0)") : "");
    });
  },

  _setYear(timeValue) {
    const formattedTime = this.model.time.formatDate(timeValue);
    return function() { d3.select(this).text(formattedTime); };
  },

  _interaction() {
    const _this = this;
    return {
      mouseover(d, i) {
        if (utils.isTouchDevice()) return;
        _this.model.marker.highlightMarker(d);
        _this._showLabel(d);
      },
      mouseout(d, i) {
        if (utils.isTouchDevice()) return;
        _this.model.marker.clearHighlighted();
      },
      click(d, i) {
        if (utils.isTouchDevice()) return;
        _this.model.marker.selectMarker(d);
      },
      tap(d) {
        d3.event.stopPropagation();
        _this.model.marker.selectMarker(d);
      }
    };
  },

  _highlightBars(d) {
    const _this = this;

    _this.someHighlighted = (_this.model.marker.highlight.length > 0);

    _this.updateBarsOpacity();

    if (!_this.someHighlighted) {
      //hide labels
      _this.labels.selectAll(".vzb-hovered").classed("vzb-hovered", false);
    }
  },

  _showLabel(d) {
    const _this = this;
    const formatter = _this.ui.chart.inpercent ? d3.format(".1%") : _this.model.marker.axis_x.getTickFormatter();
    const sideDim = _this.SIDEDIM;
    const ageDim = _this.AGEDIM;
    const stackDim = _this.STACKDIM;
    const shiftedAgeDim = "s_age";
    const left = _this.sideKeys.indexOf(d[sideDim]) > 0;

    let deltaX = 7;
    if (!this.smallMultiples) {
      const hoverBarEl = d3.select(d3.event.target);
      deltaX += +hoverBarEl.attr("x");
    }

    const labelNode = _this.labels.select(".vzb-bc-label-" + d[shiftedAgeDim]).nodes()[d.i];// + "-" + _this._id);
    const labelEl = d3.select(labelNode);
    labelEl.selectAll(".vzb-bc-age")
      .text(textData => {
        //var total = _this.ui.chart.inpercent ? _this.totalValues[d[sideDim]] : 1;
        let text = _this.stackKeys.length > 1 ? _this.stackItems[d[stackDim]] : textData.text;
        text = _this.twoSided ? text : textData.text + " " + _this.stackItems[d[stackDim]];
        const value = _this.xScale.invert(d["width_"]);
        return text + ": " + formatter(value);
      })
      .attr("x", left ? -this.activeProfile.centerWidth - deltaX : deltaX)
      .attr("dx", 0)
      .classed("vzb-text-left", left);
    labelEl.classed("vzb-prehovered", true);
    const bbox = labelNode.getBBox();
    const transform = _this.element.node().getScreenCTM().inverse().multiply(labelNode.getScreenCTM());
    const overDrawLeft = Math.max(-bbox.x - transform.e, 0);
    const overDrawRight = Math.min(_this.fullWidth - bbox.x - bbox.width - transform.e, 0);
    labelEl.selectAll(".vzb-bc-age").attr("dx", overDrawLeft + overDrawRight);
    labelEl.classed("vzb-prehovered", false);
    labelEl.classed("vzb-hovered", true);
  },

  getGraphWidth(width, marginBetween) {
    let _width = width || this.width;
    if (this.smallMultiples) {
      const length = this.graph.data().length;
      _width -= marginBetween * (length - 1);
      return this.domainScalers.map(scaler => _width * scaler);
    } else {
      return [_width];
    }
  },

  getYAxisVisibility(index) {
    return index == 0 ? true : false;
  },

  /**
   * Executes everytime the container or vizabi is resized
   * Ideally,it contains only operations related to size
   */


  presentationProfileChanges: {
    medium: {
      margin: { top: 120, right: 50, left:80, bottom: 60, between: 30 },
      infoElHeight: 32
    },
    large: {
      margin: { top: 120, right: 70, left: 100, bottom: 70, between: 30 },
      infoElHeight: 32
    }
  },

  profiles: {
    "small": {
      margin: {
        top: 50,
        right: 20,
        left: 40,
        bottom: 20,
        between: 10
      },
      infoElHeight: 16,
      centerWidth: 2,
      titlesSpacing: 5
    },
    "medium": {
      margin: {
        top: 70,
        right: 40,
        left: 60,
        bottom: 20,
        between: 20
      },
      infoElHeight: 20,
      centerWidth: 2,
      titlesSpacing: 10
    },
    "large": {
      margin: {
        top: 80,
        right: 60,
        left: 60,
        bottom: 30,
        between: 20
      },
      infoElHeight: 22,
      centerWidth: 2,
      titlesSpacing: 20
    }
  },

  resize() {
    const _this = this;

    this.activeProfile = this.getActiveProfile(this.profiles, this.presentationProfileChanges);

    //this.activeProfile = this.profiles[this.getLayoutProfile()];
    const margin = this.activeProfile.margin;
    const infoElHeight = this.activeProfile.infoElHeight;

    const deltaMarginTop = this.sideSkip ? margin.top * 0.23 : 0;
    //stage
    this.height = (parseInt(this.element.style("height"), 10) + deltaMarginTop - margin.top - margin.bottom) || 0;
    this.width = (parseInt(this.element.style("width"), 10) - margin.left - margin.right) || 0;
    this.fullWidth = parseInt(this.element.style("width"), 10) || 0;
    this.graphWidth = this.getGraphWidth(this.width, margin.between);

    if (this.height <= 0 || this.width <= 0) return utils.warn("Pop by age resize() abort: vizabi container is too little or has display:none");

    let _sum = 0;
    let _prevSum = 0;
    const graphWidthSum = this.graphWidth.map(width => {_prevSum = _sum; _sum += width; return _prevSum;});
    this.graph
      .attr("transform", (d, i) => "translate(" + Math.round(margin.left + margin.between * i + graphWidthSum[i]) + "," + (margin.top - deltaMarginTop) + ")");

    this.barsCrop
      .attr("width", (d, i) => this.graphWidth[i])
      .attr("height", Math.max(0, this.height));

    this.lockedCrop
      //.attr("width", (d, i) => this.graphWidth[i])
      .attr("height", Math.max(0, this.height));

    this.labelsCrop
      .attr("width", (d, i) => this.graphWidth[i])
      .attr("height", Math.max(0, this.height));

    const groupBy = this.groupBy;

    const domain = this.yScale.domain();
    this.oneBarHeight = this.height / (domain[1] - domain[0]);
    const barHeight = this.barHeight = this.oneBarHeight * groupBy; // height per bar is total domain height divided by the number of possible markers in the domain
    this.firstBarOffsetY = this.height - this.barHeight;

    if (this.stackBars) this.stackBars.attr("height", barHeight - (groupBy > 2 ? 1 : 0));

    if (this.sideBars) this.sideBars
      .attr("transform", (d, i) => i ? ("scale(-1,1) translate(" + _this.activeProfile.centerWidth + ",0)") : "");


    //update scales to the new range
    //apply scales to axes and redraw
    this.yScale.range([this.height, 0]);

    const yScaleCopy = this.yScale.copy();
    if (groupBy > 2) {
      yScaleCopy.ticks = () => d3.range(domain[0], domain[1] + 1, groupBy);
    }

    this.yAxisEl.each(function(d, i) {
      _this.yAxis.scale(yScaleCopy.range([_this.height, 0]))
        .tickSizeInner(-_this.graphWidth[i])
        .tickSizeOuter(0)
        .tickPadding(6)
        .tickSizeMinor(-_this.graphWidth[i], 0)
        .labelerOptions({
          scaleType: _this.model.marker.axis_y.scaleType,
          toolMargin: margin,
          limitMaxTickNumber: 19,
          fitIntoScale: "optimistic",
          isPivotAuto: false
        });

      d3.select(this).attr("transform", "translate(" + 0 + ",0)")
        .call(_this.yAxis)
        .classed("vzb-bc-axis-text-hidden", !_this.getYAxisVisibility(i));
    });
    this.yAxisEl.select(".tick line").classed("vzb-hidden", true);

    const maxRange = _this.twoSided ? ((_this.graphWidth[0] - _this.activeProfile.centerWidth) * 0.5) : _this.graphWidth[0];
    this.xScale.range([0, maxRange]);

    const format = this.ui.chart.inpercent ? d3.format((groupBy > 3 ? ".1" : ".1") + "%") : this.model.marker.axis_x.getTickFormatter();

    const translateX = [];
    this.xAxisEl.each(function(d, i) {
      const maxRange = _this.twoSided ? ((_this.graphWidth[i] - _this.activeProfile.centerWidth) * 0.5) : _this.graphWidth[i];
      translateX[i] = _this.twoSided ? ((_this.graphWidth[i] + _this.activeProfile.centerWidth) * 0.5) : 0;

      _this.xAxis.scale(_this.xScale.copy().domain(_this.domains[i]).range([0, maxRange]))
        .tickFormat(format)
        .tickSizeInner(-_this.height)
        .tickSizeOuter(0)
        .tickPadding(6)
        .tickSizeMinor(0, 0)
        .labelerOptions({
          scaleType: _this.model.marker.axis_x.scaleType,
          toolMargin: margin,
          limitMaxTickNumber: 6
        });

      d3.select(this)
        .attr("transform", "translate(" + translateX[i] + "," + _this.height + ")")
        .call(_this.xAxis);
      const zeroTickEl = d3.select(this).selectAll(".tick text");
      const tickCount = zeroTickEl.size();
      if (tickCount > 0) {
        const zeroTickBBox = zeroTickEl.node().getBBox();
        if (tickCount > 1) {
          d3.select(zeroTickEl.node()).attr("dx", (_this.twoSided ? -_this.activeProfile.centerWidth * 0.5 : 0) - zeroTickBBox.width * 0.5 - zeroTickBBox.x);
        }
        zeroTickEl.classed("vzb-invisible", (_this.graphWidth[i] + margin.between) < zeroTickBBox.width);
      }
    });

    this.xAxisEl.select(".tick line").classed("vzb-hidden", true);
    this.xAxisLeftEl.classed("vzb-hidden", !this.twoSided);
    if (this.twoSided) {
      this.xScaleLeft.range([(this.graphWidth[0] - this.activeProfile.centerWidth) * 0.5, 0]);

      this.xAxisLeftEl.each(function(d, i) {

        _this.xAxisLeft.scale(_this.xScaleLeft.copy().domain(_this.domains[i]).range([(_this.graphWidth[i] - _this.activeProfile.centerWidth) * 0.5, 0]))
          .tickFormat(format)
          .tickSizeInner(-_this.height)
          .tickSizeOuter(0)
          .tickPadding(6)
          .tickSizeMinor(0, 0)
          .labelerOptions({
            scaleType: _this.model.marker.axis_x.scaleType,
            toolMargin: margin,
            limitMaxTickNumber: 6
          });
        d3.select(this)
          .attr("transform", "translate(0," + _this.height + ")")
          .call(_this.xAxisLeft);
        //hide left axis zero tick
        const tickNodes = d3.select(this).selectAll(".tick").classed("vzb-hidden", false).nodes();
        d3.select(tickNodes[tickNodes.length - 1]).classed("vzb-hidden", true);
      });
    }

    const isRTL = this.model.locale.isRTL();

    this.bars.attr("transform", (d, i) => "translate(" + translateX[i] + ",0)");
    this.lockedPaths.attr("transform", (d, i) => "translate(" + translateX[i] + ",0)");
    this.labels.attr("transform", (d, i) => "translate(" + translateX[i] + ",0)");

    const titleSpace = (i) => (translateX[i] - this.activeProfile.titlesSpacing) < 0 ? _this.activeProfile.centerWidth * 0.5 : _this.activeProfile.titlesSpacing;

    this.title
      .attr("x", (d, i) => this.twoSided ? translateX[i] - _this.activeProfile.centerWidth * 0.5 - titleSpace(i) : 0)
      .style("text-anchor", this.twoSided ? "end" : "")
      .attr("y", -margin.top * 0.275 - deltaMarginTop)
      .each(function(d, i) {
        _this.textEllipsis.wrap(this, _this.twoSided ? (_this.graphWidth[i] + margin.between - titleSpace(i)) * 0.5 : _this.graphWidth[i] +  margin.between)
      });
    this.titleRight
      .attr("x", (d, i) => translateX[i] - _this.activeProfile.centerWidth * 0.5 + titleSpace(i))
      .attr("y", -margin.top * 0.275 - deltaMarginTop)
      .each(function(d, i) {
        _this.textEllipsis.wrap(this, (_this.graphWidth[i] + margin.between - titleSpace(i)) * 0.5)
      });
    this.titleCenter
      .attr("x", (d, i) => this.twoSided ? translateX[i] - _this.activeProfile.centerWidth * 0.5: _this.graphWidth[i] * 0.5)
      .style("text-anchor", "middle")
      .attr("y", (-margin.top - deltaMarginTop)* 0.035 )
      .each(function(d, i) {
        _this.textEllipsis.wrap(this, _this.graphWidth[i] +  margin.between)
      });

    this.xTitleEl
      .style("font-size", infoElHeight + "px")
      .attr("transform", "translate(" + (isRTL ? margin.left + this.width + margin.right * 0.6 : margin.left * 0.4) + "," + (margin.top * 0.35) + ")");

    if (this.xInfoEl.select("svg").node()) {
      const titleBBox = this.xTitleEl.node().getBBox();
      const t = utils.transform(this.xTitleEl.node());
      const hTranslate = isRTL ? (titleBBox.x + t.translateX - infoElHeight * 1.4) : (titleBBox.x + t.translateX + titleBBox.width + infoElHeight * 0.4);

      this.xInfoEl.select("svg")
        .attr("width", infoElHeight + "px")
        .attr("height", infoElHeight + "px");
      this.xInfoEl.attr("transform", "translate("
        + hTranslate + ","
        + (t.translateY - infoElHeight * 0.8) + ")");
    }

    const yearLabelOptions = {
      topOffset: this.ui.presentation ? 25 : this.getLayoutProfile() === "small" ? 10 : 15,
      leftOffset: this.getLayoutProfile() === "small" ? 5 : 10,
      rightOffset: this.getLayoutProfile() === "small" ? 5 : 10,
      xAlign: isRTL ? "left" : "right",
      yAlign: "top",
      heightRatio: this.ui.presentation ? 0.5 : 0.5,
      //widthRatio: this.getLayoutProfile() === "large" ? 3 / 8 : 5 / 10
    };

    //year resized
    this.year
      .setConditions(yearLabelOptions)
      .resize(this.fullWidth, margin.top);
    this.yearLocked.attr("x", this.width + margin.left + margin.right - 10).attr("y", (margin.top - deltaMarginTop) * (this.getLayoutProfile() === "large" ? 1.27 : 1.27));

  },

  updateBarsOpacity(duration) {
    const _this = this;

    const OPACITY_HIGHLT = 1.0;
    const OPACITY_HIGHLT_DIM = this.model.marker.opacityHighlightDim;
    const OPACITY_SELECT = 1.0;
    const OPACITY_REGULAR = this.model.marker.opacityRegular;
    const OPACITY_SELECT_DIM = this.model.marker.opacitySelectDim;

    const nonSelectedOpacityZero = _this.model.marker.opacitySelectDim < 0.01;
    const nonSelectedOpacityZeroFlag = nonSelectedOpacityZero != this.nonSelectedOpacityZero;
    const someSelected = this.someSelected;
    const someHighlighted = this.someHighlighted;

    this.stackBars.each(function(d) {
      const isSelected =  someSelected ? _this.model.marker.isSelected(d) : false;
      const isHighlighted = someHighlighted ? _this.model.marker.isHighlighted(d): false;
      const bar = d3.select(this);

      bar.style("opacity", isHighlighted ? OPACITY_HIGHLT
        :
        someSelected ? (isSelected ? OPACITY_SELECT : OPACITY_SELECT_DIM)
          :
          someHighlighted ? OPACITY_HIGHLT_DIM : OPACITY_REGULAR)
        .style("stroke", isSelected ? "#333" : null)
        .style("y", isSelected ? "0.5px" : null);

      if(nonSelectedOpacityZeroFlag) {
        bar.style("pointer-events", !someSelected || !nonSelectedOpacityZero || isSelected ? "visible" : "none");
      }
    });

    this.nonSelectedOpacityZero = _this.model.marker.opacitySelectDim < 0.01;
  }

}

_VizabiPopByAge.DEFAULT_UI = {

  showForecast: true,
  showForecastOverlay: true,
  pauseBeforeForecast: false,
  opacityHighlightDim: 0.1,
  opacitySelectDim: 0.3,
  opacityRegular: 1,
}

export const VizabiPopByAge = decorate(_VizabiPopByAge, {
  "xScale": computed,
  "yScale": computed,
  "cScale": computed,
  "stepSeries": computed,
  "ageKeys": computed,
  "sideKeys": computed,
  "stackKeys": computed,
  "domains": computed,
  "allLimitsAndTotals": computed,
  "groupBy": computed,
  "MDL": computed,
});