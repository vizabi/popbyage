import {
  BaseComponent,
  Icons,
  Utils,
  LegacyUtils as utils,
  axisSmart,
  DateTimeBackground,
  TextEllipsis
} from "VizabiSharedComponents";

import {
  decorate,
  computed,
  runInAction
} from "mobx";

const {ICON_QUESTION} = Icons;

const SYMBOL_KEY = Symbol.for("key");
const SYMBOL_KEY2 = Symbol.for("key2");
const SYMBOL_STACKEDSUM = Symbol.for("stackedSum");

//
// POPBYAGE CHART COMPONENT
class _VizabiPopByAge extends BaseComponent {

  constructor(config) {
    config.subcomponents = [{
      type: DateTimeBackground,
      placeholder: ".vzb-bc-date-now"
    }];

    config.template = `
      <svg class="vzb-popbyage-svg vzb-export">
        <g class="vzb-bc-header">
            <g class="vzb-bc-axis-x-title">
              <text></text>
            </g>
            <g class="vzb-bc-axis-x-info vzb-noexport"></g>
            <g class="vzb-bc-date-now"></g>
            <text class="vzb-bc-date vzb-bc-date-locked"></text>
        </g>
        <g class="vzb-bc-graph">
            <text class="vzb-bc-title"></text>
            <text class="vzb-bc-title vzb-bc-title-right"></text>
            <text class="vzb-bc-title vzb-bc-title-center"></text>
            <g class="vzb-bc-closecross vzb-noexport">
              <text>×</text>
            </g>

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
      <svg width="0" height="0">
        <defs>
            <pattern class="vzb-noexport" id="vzb-bc-pattern-lines" x="0" y="0" patternUnits="userSpaceOnUse" width="50" height="50" viewBox="0 0 10 10">
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
      dateLocked: this.element.select(".vzb-bc-date-locked"),
      forecastOverlay: this.element.select(".vzb-bc-forecastoverlay"),
      graph: this.element.select(".vzb-bc-graph"),
      closeCross: this.element.select(".vzb-bc-closecross"),
    };
    this.__updateGraphDOM(this.DOM.graph);
    
    this._date = this.findChild({type: "DateTimeBackground"});

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

    this.element.style("overflow", this.isInFacet ? "visible" : null);
    this.DOM.svg.style("overflow", this.isInFacet ? "visible" : null);
    this.DOM.svg.style("width", this.isInFacet ? "100%" : null);
    this.DOM.svg.style("height", this.isInFacet ? "100%" : null);
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
      facet: this.model.encoding.facet_column,
      aggregate: this.model.encoding.aggregate
    };
  }

  get groupBy() {
    this.DOM.labels.text(""); //TODO: find more clear way
    return this.MDL.aggregate.grouping["age"].grouping;
  }

  draw() {
    this.localise = this.services.locale.auto(this.MDL.frame.interval);

    this.yAxis.tickFormat(this.localise);
    this.xAxis.tickFormat(this.localise);
    this.xAxisLeft.tickFormat(this.localise);

    this.geoDomainDimension = this.MDL.facet.data.concept;
    this.geoDomainDefaultValue = "world";//this.model.entities_geodomain.show[this.geoDomainDimension]["$in"][0];

    //this.groupBy = this.MDL.aggregate.grouping["age"].grouping;
    this.timeSteps = this.MDL.frame.stepScale.domain();

    if (this._updateLayoutProfile()) return; //return if exists with error


    this.addReaction(this.checkDimensions);
    this.addReaction(this._clearLockAndSelectedOnGroupByChange);
    this.addReaction(this._updateIndicators);
    //this.addReaction(this._checkFrameValue);
    this.addReaction(this.updateUIStrings);
    //this.addReaction(this._setupLimits);
    //this.addReaction(this._updateLimits);
    this.addReaction(this._updateSideTitles);
    this.addReaction(this._updateMaxValues);
    this.addReaction(this.updateSize);
    this.addReaction(this._updateForecastOverlay);
    //this.addReaction(this._updateStepSeries);
    this.addReaction(this.drawData);
    this.addReaction(this._redrawLocked);
    this.addReaction(this._highlightBars);


  }

  _updateLayoutProfile() {
    this.services.layout.size;

    if (!this.size.height || !this.size.width) return utils.warn("Chart _updateProfile() abort: container is too little or has display:none");
  }

  get profileConstants() { 
    this.services.layout.size; //watch
    return this.services.layout.getProfileConstants(PROFILE_CONSTANTS, PROFILE_CONSTANTS_FOR_PROJECTOR, this.state.positionInFacet);
  }

  get size() {
    this.services.layout.size; //watch
    this.ui.inpercent;
    if (this.isInFacet) {
      this.parent.scaleRange;
      this.parent.rangePartsHash;
    }

    const {margin} = this.profileConstants;
    const deltaMarginTop = this.sideSkip ? margin.top * 0.23 : 0;    
    const width = this.element.node().clientWidth || 0;
    const height = this.element.node().clientHeight || 0;

    return {
      width,
      height,
      innerWidth: width - margin.left - margin.right,
      innerHeight: height + deltaMarginTop - margin.top - margin.bottom
    }
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

  get _getDataArrayForFacet() {
    if(this.isManyFacets)
      return this.parent.getDataForSubcomponent(this.name);
    else
      return this.model.dataArray;
  }

  get _getFacetEncName() {
    return "facet_" + this.parent.direction;
  }

  drawData() {
    this.size;

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

    this.frame = stepFraction == 0 ? this._processData(step == this.MDL.frame.step ? this._getDataArrayForFacet : [...this.model.getDataMapByFrameValue(this.MDL.frame.stepScale.invert(step)).rows()])
      : 
      this._interpolateDiagonal(...(a=>[this.stepSeries[a],this.stepSeries[a+1]])(~~((this.MDL.frame.step - this.stepSeries[0])/ this.groupBy)).map(this.MDL.frame.stepScale.invert).map(v => this.model.getDataMapByFrameValue(v).rows()), stepFraction, this._getFacetEncName, this.name)
    this._updateEntities(true, 
      step ?? this.stepSeries[0],
      step == undefined ? this.MDL.frame.stepScale.domain()[0] : this.MDL.frame.stepScale.invert(step)
    );
    this.updateBarsOpacity();
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

  _processData(dataArray) {
    const data = {};
    for (let index = 0; index < dataArray.length; index++) {
      const element = dataArray[index];
      data[element[SYMBOL_KEY]] = element;
    }
    return data;
  }

  _interpolateDiagonal(pData, nData, fraction, filterKey, filterValue) {
    const data = {};
    let newRow, shiftedRow;
    for (const row of nData) {
      if (row[filterKey] == filterValue) {
        newRow = Object.assign({}, row);
        data[newRow[SYMBOL_KEY]] = newRow;
        break;
      }
      pData.next();
    }
    for (const row of nData) {
      if (row[filterKey] !== filterValue) {
        break;
      }
      newRow = Object.assign({}, row);
      shiftedRow = pData.next().value;
      newRow.x = shiftedRow.x + (newRow.x - shiftedRow.x) * fraction;
      data[newRow[SYMBOL_KEY]] = newRow;
    }
    return data;
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

    this.DOM.closeCross
      .classed("vzb-hidden", !this.isManyFacets)
      .on("mouseover", () => {
        this.element.classed("vzb-chart-removepreview", true);
      })
      .on("mouseout", () => {
        this.element.classed("vzb-chart-removepreview", false);
      })
      .on("click", () => {
        this.model.data.filter.delete(this.name);
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
    return this.isInFacet ? [this.name] : this.MDL.facet.scale.domain;
  }

  get xScale() {
    const maxRange = this.twoSided ? (this.size.innerWidth - this.profileConstants.centerWidth) * 0.5 : this.size.innerWidth;
    return this.MDL.x.scale.d3Scale.copy().domain(this.domains[0]).range([0, maxRange]);
  }

  get yScale() {
    return this.MDL.y.scale.d3Scale.copy().range([this.size.innerHeight, 0]);;
  }

  get cScale() {
    return this.MDL.color.scale.d3Scale.copy();
  }

  get isInFacet(){
    return this.parent.constructor.name === "_Facet";
  }

  get isManyFacets(){
    return this.isInFacet && this.parent.howManyFacets() > 1;
  }

  get stacked() {
    return this.ui.stacked && !this.MDL.color.data.isConstant;
  }

  get twoSided() {
    return this.sideKeys.length > 1;
  }

  get oneBarHeight() {
    const domain = d3.extent(this.yScale.domain());
    return this.size.innerHeight / (domain[1] - domain[0]);
  }
  get barHeight() {
    return this.oneBarHeight * this.groupBy; // height per bar is total domain height divided by the number of possible markers in the domain
  }

  get firstBarOffsetY() {
    return this.size.innerHeight - this.barHeight;
  }

  get sideSkip() {
    return this.MDL.side.data.isConstant;
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

    const title = this.stackKeys.length && stackItems[this.stackKeys[0]] && !this.stackSkip ? stackItems[this.stackKeys[0]] : "";
    this.DOM.titleCenter.text(title).call(this._textEllipsis.clear);
  }

  _interaction() {
    const _this = this;
    return {
      mouseover(event, d) {
        if (utils.isTouchDevice()) return;
        _this.MDL.highlighted.data.filter.set(d, JSON.stringify({color: d[_this.STACKDIM]}));
        _this._showLabel(event, d);
      },
      mouseout(event, d) {
        if (utils.isTouchDevice()) return;
        _this.MDL.highlighted.data.filter.delete(d);
      },
      click(event, d) {
        if (utils.isTouchDevice()) return;
        _this.MDL.selected.data.filter.toggle(d);
      },
      tap(event, d) {
        event.stopPropagation();
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

    const oneBarHeight = this.oneBarHeight;
    const barHeight = this.barHeight;
    const firstBarOffsetY = this.firstBarOffsetY;

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
      .data(d => ( d.stack = stacks.map(m => {
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

    this._date.setText(this.MDL.frame.value, this.duration);
  }

  _isDragging(){
    const timeslider = this.root.findChild({type: "TimeSlider"});
    return timeslider && timeslider.ui.dragging;
  }

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
      _stack = row[stackDim] ?? stackDim;
      if (!this.stackKeys.includes(_stack)) continue;

      _time = "" + row[timeDim];
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

  get domains() {
    this.groupBy;
    
    const maxLimits = {};
    const inpercentMaxLimits = {};
    const domains = [];
    this._createLimits(maxLimits, inpercentMaxLimits, this.allLimitsAndTotals.totals);
    this._createDomains(domains, maxLimits, inpercentMaxLimits);
    return domains;
  }

  _updateMaxValues() {
    if (this.isInFacet) {
      const domains = this.domains;
      runInAction(() => {
        this.parent.maxValues.set(this.name, domains.reduce((result, d) => {
          result += d[0] + d[1];
          return result;
        }, 0))
      });
    }
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
    if (this.stacked) {
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
    this.size;

    const _this = this;
    if (this.ui.lockNonSelected) {
      this.lock = this.ui.lockNonSelected;

      const lockTime = this.MDL.frame.parseValue(this.ui.lockNonSelected);
      const lockFrame = this.model.getDataMapByFrameValue(lockTime);
      const lockTotal = this._updateTotal(lockTime);
      this._makeOutlines(lockFrame, lockTotal);

      this.DOM.dateLocked.text("" + this.ui.lockNonSelected);
    } else {
      this.DOM.lockedPaths.text("");
      this.DOM.dateLocked.text("");
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
    this.size;

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
      dateLocked,
    } = this.DOM;

    const margin = this.profileConstants.margin;
    const infoElHeight = this.profileConstants.infoElHeight;

    const deltaMarginTop = this.sideSkip ? margin.top * 0.23 : 0;
    //stage
    const height = this.size.innerHeight;
    const width = this.size.innerWidth;
    this.fullWidth = (this.isInFacet ? this.parent.width : this.size.width) || 0;

    if (height <= 0 || width <= 0) return utils.warn("Pop by age resize() abort: vizabi container is too little or has display:none");

    graph.attr("transform", "translate(" + margin.left + "," + (margin.top - deltaMarginTop) + ")");

    barsCrop
      .attr("width", Math.max(0, width))
      .attr("height", Math.max(0, height));

    lockedCrop
      .attr("width", Math.max(0, width))
      .attr("height", Math.max(0, height));

    labelsCrop
      .attr("width", Math.max(0, width))
      .attr("height", Math.max(0, height));

    const groupBy = this.groupBy;

    const domain = d3.extent(this.yScale.domain());
    const barHeight = this.barHeight;

    if (this.stackBars) this.stackBars.attr("height", barHeight - (groupBy > 2 ? 1 : 0));

    if (this.sideBars) this.sideBars
      .attr("transform", (d, i) => i ? ("scale(-1,1) translate(" + _this.profileConstants.centerWidth + ",0)") : "");

    //update scales to the new range
    //apply scales to axes and redraw

    const yScaleCopy = this.yScale.copy().domain(domain);
    if (groupBy > 2) {
      yScaleCopy.ticks = () => d3.range(domain[0], domain[1] + 1, groupBy);
    }

    _this.yAxis.scale(yScaleCopy.range([height, 0]))
      .tickSizeInner(-width)
      .tickSizeOuter(0)
      .tickPadding(6)
      .tickSizeMinor(-width, 0)
      .labelerOptions({
        scaleType:  y.scale.type,
        toolMargin: margin,
        limitMaxTickNumber: 19,
        fitIntoScale: "optimistic",
        isPivotAuto: false,
        formatter: _this.localise
      });

    yAxisEl.attr("transform", "translate(" + 0 + ",0)")
      .call(_this.yAxis)
      .classed("vzb-bc-axis-text-hidden", false)//!_this.getYAxisVisibility(i));
    yAxisEl.select(".tick line").classed("vzb-hidden", true);


    const format = this.ui.inpercent ? d3.format((groupBy > 3 ? ".1" : ".1") + "%") : this.localise;

    const translateX = _this.twoSided ? ((width + _this.profileConstants.centerWidth) * 0.5) : 0;

    _this.xAxis.scale(_this.xScale.copy())
      .tickFormat(format)
      .tickSizeInner(-height)
      .tickSizeOuter(0)
      .tickPadding(6)
      .tickSizeMinor(0, 0)
      .labelerOptions({
        scaleType: x.scale.type,
        toolMargin: margin,
        limitMaxTickNumber: 6,
        //formatter: _this.localise
      });

    xAxisEl
      .attr("transform", "translate(" + translateX + "," + height + ")")
      .call(_this.xAxis);
    const zeroTickEl = xAxisEl.selectAll(".tick text");
    const tickCount = zeroTickEl.size();
    if (tickCount > 0) {
      const zeroTickBBox = zeroTickEl.node().getBBox();
      if (tickCount > 1) {
        d3.select(zeroTickEl.node()).attr("dx", (_this.twoSided ? -_this.profileConstants.centerWidth * 0.5 : 0) - zeroTickBBox.width * 0.5 - zeroTickBBox.x);
      }
      zeroTickEl.classed("vzb-invisible", (width + margin.betweenColumn) < zeroTickBBox.width);
    }

    xAxisEl.select(".tick line").classed("vzb-hidden", true);
    xAxisLeftEl.classed("vzb-hidden", !this.twoSided);
    if (this.twoSided) {
      this.xScaleLeft.range([(width - this.profileConstants.centerWidth) * 0.5, 0]);

      this.xAxisLeft.scale(this.xScaleLeft.copy())
        .tickFormat(format)
        .tickSizeInner(-height)
        .tickSizeOuter(0)
        .tickPadding(6)
        .tickSizeMinor(0, 0)
        .labelerOptions({
          scaleType: x.scale.type,
          toolMargin: margin,
          limitMaxTickNumber: 6,
          //formatter: this.localise
        });
      xAxisLeftEl
        .attr("transform", "translate(0," + height + ")")
        .call(this.xAxisLeft);
      //hide left axis zero tick
      const tickNodes = xAxisLeftEl.selectAll(".tick").classed("vzb-hidden", false).nodes();
      d3.select(tickNodes[tickNodes.length - 1]).classed("vzb-hidden", true);
    }

    const isRTL = this.services.locale.isRTL();

    bars.attr("transform", "translate(" + translateX + ",0)");
    lockedPaths.attr("transform", "translate(" + translateX + ",0)");
    labels.attr("transform", "translate(" + translateX + ",0)");

    const titleSpace = (translateX - this.profileConstants.titlesSpacing) < 0 ? _this.profileConstants.centerWidth * 0.5 : _this.profileConstants.titlesSpacing;

    title
      .attr("x", (d, i) => this.twoSided ? translateX - _this.profileConstants.centerWidth * 0.5 - titleSpace : 0)
      .style("text-anchor", this.twoSided ? "end" : "")
      .attr("y", -margin.top * 0.275 - deltaMarginTop)
      .each(function(d, i) {
        _this._textEllipsis.wrap(this, _this.twoSided ? (width + margin.betweenColumn - titleSpace) * 0.5 : width +  margin.betweenColumn)
      });
    titleRight
      .attr("x", translateX - _this.profileConstants.centerWidth * 0.5 + titleSpace)
      .attr("y", -margin.top * 0.275 - deltaMarginTop)
      .each(function(d, i) {
        _this._textEllipsis.wrap(this, (width + margin.betweenColumn - titleSpace) * 0.5)
      });
    titleCenter
      .attr("x", this.twoSided ? translateX - _this.profileConstants.centerWidth * 0.5: width * 0.5)
      .style("text-anchor", "middle")
      .attr("y", (-margin.top - deltaMarginTop)* 0.035 )
      .each(function(d, i) {
        _this._textEllipsis.wrap(this, width +  margin.betweenColumn)
      });
    

    const titleWidth = titleCenter.node().getBoundingClientRect().width;
    const xPosCloseCross = titleWidth > width ? (titleWidth - width) * 0.5 : null;

    this.DOM.closeCross
      .style("font-size", infoElHeight + "px")
      .attr("transform", "translate(" + (isRTL ? 0 : width) + "," + (-margin.top - deltaMarginTop)* 0.035 + ")")
      .select("text")
      .attr("dx", isRTL ? "-0.5em": "-0.1em")
      .attr("dy", "-0.05em")
      .attr("x", (isRTL ? -1 : 1) * xPosCloseCross);

    xTitleEl
      .style("font-size", infoElHeight + "px")
      .attr("transform", "translate(" + (isRTL ? margin.left + width + margin.right * 0.6 : margin.left * 0.4) + "," + (margin.top * 0.35) + ")");

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
    this._date
      .setConditions(yearLabelOptions)
      .resizeText(this.fullWidth, margin.top);
    dateLocked.attr("x", width + margin.left + margin.right - 10).attr("y", (margin.top - deltaMarginTop) * (this.services.layout.profile === "large" ? 1.27 : 1.27));

  }

  _showLabel(event, d) {
    const _this = this;
    const formatter = _this.ui.inpercent ? d3.format(".1%") : _this.localise;
    const sideDim = _this.SIDEDIM;
    const ageDim = _this.AGEDIM;
    const stackDim = _this.STACKDIM;
    const shiftedAgeDim = "s_age";
    const left = _this.sideKeys.indexOf(d[sideDim]) > 0;

    let deltaX = 7;
    const hoverBarEl = d3.select(event.target);
    deltaX += +hoverBarEl.attr("x");

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

const PROFILE_CONSTANTS = _VizabiPopByAge.PROFILE_CONSTANTS = {
  SMALL: {
    margin: {
      top: 50,
      right: 20,
      left: 40,
      bottom: 20,
      betweenColumn: 10
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
      betweenColumn: 20
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
      betweenColumn: 20
    },
    infoElHeight: 22,
    centerWidth: 2,
    titlesSpacing: 20
  }
}

const PROFILE_CONSTANTS_FOR_PROJECTOR = _VizabiPopByAge.PROFILE_CONSTANTS_FOR_PROJECTOR = {
  MEDIUM: {
    margin: { top: 120, right: 50, left:80, bottom: 60, betweenColumn: 30 },
    infoElHeight: 32
  },
  LARGE: {
    margin: { top: 120, right: 70, left: 100, bottom: 70, betweenColumn: 30 },
    infoElHeight: 32
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
  "twoSided": computed,
  "domains": computed,
  "allLimitsAndTotals": computed,
  "groupBy": computed,
  "MDL": computed,
  "isInFacet": computed,
  "isManyFacets": computed,
  "_getDataArrayForFacet": computed,
  "_getFacetEncName": computed,
  "size": computed,
  "profileConstants": computed,
  "barHeight": computed,
  "oneBarHeight": computed,
  "firstBarOffsetY": computed,
  "sideSkip": computed
});