import * as ko from "knockout";
import * as d3 from "d3";
import { ViewModel } from "viewmodel";
declare var UndoManager: any;
declare var RandomColor: any;
declare var pic_id: string;

export class EditorViewModel extends ViewModel {
    polygonTypes: KnockoutObservableArray<any> = ko.observableArray();
    polygons: KnockoutObservableArray<any> = ko.observableArray();
    currDefect: KnockoutObservable<any> = ko.observable();
    currType: KnockoutObservable<any> = ko.observable();
    newType: KnockoutObservable<any> = ko.observable();
    polygonTypeToNameMapping: KnockoutComputed<any>;
    canSave: KnockoutObservable<boolean> = ko.observable<boolean>();
    hasUndo: KnockoutObservable<boolean> = ko.observable<boolean>();
    hasRedo: KnockoutObservable<boolean> = ko.observable<boolean>();
    undoManager: any;
    svg: any;
    polyStarted: boolean = false;
    picId: string;
    width: number = 808;
    height: number = 608;
    htmlElemName: string = 'editorVM';
    scaleX = d3.scale.linear()
        .domain([0, this.width])
        .range([0, this.width]);

    scaleY = d3.scale.linear()
        .domain([0, this.height])
        .range([this.height, 0]);

    mouseScaleX = d3.scale.linear()
        .domain([0, this.width])
        .range([0, this.width]);

    mouseScaleY = d3.scale.linear()
        .domain([this.height, 0])
        .range([0, this.height]);

    fontSize: number = this.mouseScaleX(20);
    mainCircleRadius: number = this.mouseScaleX(10);
    circleRadius: number = this.mouseScaleX(3);

    constructor() {
        super();
        this.picId = pic_id;
        this.newType.subscribe(newVal => {
            if (newVal !== "") {
                this.currDefect().type = newVal;
                this.polygons(this.polygons());
            }
        });

        this.currType.subscribe(newVal => {
            if (newVal === undefined)
                return;
            this.currDefect().type = newVal;
            this.newType("");
            this.polygons(this.polygons());
        });

        this.currDefect.subscribe(newVal => {
            if (newVal !== undefined) {
                this.currType(newVal.type);
                this.highlightPolygon(newVal);
                this.canSave(true);
            }
        });

        this.undoManager = new UndoManager();
        this.undoManager.setCallback(() => this.onUndoManagerUpdate());
        this.loadPolygonTypes();
        this.loadPolygons();

        this.polygonTypeToNameMapping = ko.computed(function() {
            let mapping: any = {},
                polygonTypes = this.polygonTypes;

            for (let i = 0; i < polygonTypes.length; ++i) {
                mapping[polygonTypes[i].type] = polygonTypes[i].readable_name;
            }
            return mapping;
        }, this);
    }

    addPoly() {
        this.polygons.push({
            "type": "unknown",
            "stroke_color": this.getNewColor(),
            "points": [],
            "occluded": false
        });
        this.currDefect(this.polygons().slice(-1)[0]);
    };

    delPoly() {
        this.polygons.remove(this.currDefect());
        this.currDefect(this.polygons()[0]);
        if(this.polygons().length == 0)
            this.svg
                .selectAll("g[id^='poly']")
                .remove();
        this.updatePolygons();
    };

    getNewColor(): any {
        let newColor = RandomColor({ luminosity: 'dark' });

        for (let i = 0; i < this.polygons.length; i++) {
            if (newColor == this.polygons()[i].stroke_color) {
                return this.getNewColor();
            }
        }
        return newColor;
    };

    onUndoManagerUpdate() {
        this.updatePolygons();
        this.canSave(this.currDefect().points.length > 0);
        this.hasUndo(this.undoManager.hasUndo());
        this.hasRedo(this.undoManager.hasRedo());
    };

    loadPolygonTypes() {
        d3.json("/polygon_types", json => this.polygonTypes(json.types));
    };

    loadPolygons() {
        d3.json("/pic/" + this.picId + "/polygons", json => this.initPolygons(json));
    }

    initPolygons(json: any) {
        let boardRect = json.rect;
        this.svg = d3.select("body")
            .select("#svgPlace")
            .attr("width", boardRect.w - boardRect.x)
            .attr("height", boardRect.h - boardRect.y)
            .on("click", () => this.createPoint())
            .on("dblclick", () => this.createPolygon());

        if (this.picId !== "") {
            this.svg.append("svg:image")
                .attr("xlink:href", "/pic/" + this.picId + ".png")
                .attr("x", -boardRect.x)
                .attr("y", -boardRect.y)
                .attr("width", this.width)
                .attr("height", this.height);
        }

        for (let i = 0; i < json.polygons.length; i++) {
            if (json.polygons[i].occluded) {
                json.polygons[i].points.push(json.polygons[i].points[0]);
            }
        }
        this.polygons(json.polygons);
        this.updatePolygons();
        this.currDefect(this.polygons()[0]);
        this.canSave(this.currDefect() !== undefined && this.currDefect().points.length > 0);
    };

    drawEllipse(cx: number, cy: number, halfWidth: number, halfHeight: number){
        let a = halfWidth*1.4;
        let b = Math.sqrt(a*a*halfHeight*halfHeight/(a*a - halfWidth*halfWidth));

        let leftPoint = {
            "x": cx - a,
            "y": cy
        };

        let rightPoint = {
            "x": cx + a,
            "y": cy
        };

        let topPoint = {
            "x": cx,
            "y": cy - b
        };

        let bottomPoint = {
            "x": cx,
            "y": cy + b
        };

        let topLeftPoint = {
            "x": cx - halfWidth,
            "y": cy - halfHeight
        };

        let topRightPoint = {
            "x": cx + halfWidth,
            "y": cy - halfHeight
        };

        let bottomLeftPoint = {
            "x": cx - halfWidth,
            "y": cy + halfHeight
        };

        let bottomRightPoint = {
            "x": cx + halfWidth,
            "y": cy + halfHeight
        };
        let points = this.currDefect().points;
        points.push(leftPoint);
        points.push(topLeftPoint);
        points.push(topPoint);
        points.push(topRightPoint);
        points.push(rightPoint);
        points.push(bottomRightPoint);
        points.push(bottomPoint);
        points.push(bottomLeftPoint);
        points.push({
            "x": cx - a,
            "y": cy
        });
    }

    createPolygon(){
        this.addPoly();

        this.polyStarted = true;
        this.svg.on("mousemove", () => this.mousemove());
        this.startPoint = this.getCurrMousePoint();

        d3.event.stopPropagation();
    }

    updatePolygons() {
        let polygons  = this.getPolygons();
        let polylines = this.svg.selectAll("polyline")
            .data(polygons);

        polylines.enter()
            .append("polyline")
            .call((l: any) => this.onPolyline(l));
        polylines.call((l: any) => this.onPolyline(l));
        polylines.call((x: any) => this.onClear(x));
    }

    onClear(fig: any)
    {
        fig.exit().remove();
    }

    updateCircles(polygon: any) {
        //we select group which contains points(circles) of current polygon
        let ind: number = this.polygons.indexOf(polygon);
        let groupId: string = "#poly"+ind;
        let group = this.svg.select(groupId);

        if(group.empty())
        {
            this.svg.append("g").attr("id", groupId.substring(1));
            group =  this.svg.select(groupId);
        }

        let circles = group
                    .selectAll("circle")
                    .data(polygon.points);

        if(polygon == this.currDefect()){
            circles.enter()
                .append("circle")
                .call((l: any) => this.onCircle(l, polygon.stroke_color));
            circles.call((l: any) => this.onCircle(l, polygon.stroke_color));
        }
        circles.call((x: any) => this.onClear(x));
    }

    highlightPolygon(polygon: any) {
        //we remove groups that contains points(circles) of other polygons
        let ind: number = this.polygons.indexOf(polygon);
        let groupId: string = "poly"+ind;

        this.svg
            .selectAll("g[id^='poly']")
            .filter(":not([id='" + groupId + "'])")
            .remove();

        //highlights current polygon with circles on it vertexes
        this.updatePolygons();
    }

    onPolygonMove(polygon: any){
        for(let i = 0; i < polygon.points.length; i++){
            polygon.points[i].x += d3.event.dx;
            polygon.points[i].y -= d3.event.dy;
        }
        this.updatePolygons();
    }

    onCircleMove(circle: any){
        circle.x += d3.event.dx;
        circle.y -= d3.event.dy;
        this.updatePolygons();
    }

    onPolyline(line: any) {
          line.attr("points", (d: any) => this.getMappedPoints(d))
            .attr("stroke", (d: any) => d.stroke_color)
            .attr("fill", "none")
            .attr("stroke-width", 3)
            .on("click", (l: any) => this.onPolygonClick(l))
            .call(d3.behavior.drag().on("drag", (p: any) => this.onPolygonMove(p)))
            .each((p: any) => this.updateCircles(p))
    }

    onPolygonClick(l: any) {
        this.currDefect(l);
        d3.event.stopPropagation();
    }

    onCircle(circle: any, stroke_color: any) {
        circle.attr("cx", (d: any) => this.getCircleX(d))
            .attr("cy", (d: any) => this.getCircleY(d))
            .attr("r", this.circleRadius)
            .attr("stroke", stroke_color)
            .attr("stroke-width", 2)
            .attr("fill", stroke_color)
            .call(d3.behavior.drag().on("drag", (p: any) => this.onCircleMove(p)))
            .on("click", (c: any) => this.onCircleClick(c));
    }

    onCircleClick(circle: any){
        if (d3.event.shiftKey) {
            let ind = this.currDefect().points.indexOf(circle);
            this.currDefect().points.splice(ind, 1);
            this.updatePolygons();
        }
    }

    onText(text: any) {
        text.attr("x", (d: any) => this.getCircleX(d))
            .attr("y", (d: any) => this.getCircleY(d, this.fontSize / 2.5))
            .text((d: any) => this.polygons().indexOf(d))
            .attr("font-family", "sans-serif")
            .attr("font-size", this.fontSize)
            .style("text-anchor", "middle")
            .style("font-weight", "bold")
            .attr("fill", "black");
    }

    getPolygons() {
        return this.polygons().filter(x => x.points.length > 0);
    }

    getMappedPoints(polygon: any) {
        return polygon.points.map((d: any) => [this.scaleX(d.x), this.scaleY(d.y)].join(",")).join(" ")
    }

    getCircleX(point: any, offset:number = 0) {
        return this.scaleX(point.x) + offset;
    }

    getCircleY(point: any, offset:number = 0) {
        return this.scaleY(point.y) + offset;
    }

    occludePolygon() {
        let def = this.currDefect();
        if (!def.occluded) {
            def.points.push(def.points[0]);
            def.occluded = true;
        } else {
            this.currDefect().occluded = false;
            this.currDefect().points.pop();
        }
        this.updatePolygons();
    };

    addPoint(point: any) {
        this.currDefect().points.push(point);
    };

    delPoint(point: any) {
        let points = this.currDefect().points;
        for (let i = 0; i < points.length; i++) {
            if (point.x == points[i].x && point.y == points[i].y) {
                points.splice(i, 1);
                break;
            }
        }
    };

    getDistance(pointA: any, pointB: any): number{
        return Math.sqrt(Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2))
    }

    startPoint: any;
    endPoint: any;
    createPoint(ignoreEvent: boolean = false) {
        if (d3.event.ctrlKey || ignoreEvent) {
            let newPoint = this.getCurrMousePoint();
            let points = this.currDefect().points;
            let minDist = this.width;
            let nearestPoint: any;
            let currDist = this.width;
            for(let i = 0; i < points.length; i++){
                currDist = this.getDistance(newPoint, points[i]);
                if(currDist < minDist){
                    minDist = currDist;
                    nearestPoint = points[i];
                }
            }

            let ind = points.indexOf(nearestPoint);
            let leftNeighbor = this.getDistance(newPoint, points[ind - 1]);
            let rightNeighbor = this.getDistance(newPoint, points[ind + 1]);

            ind += rightNeighbor > leftNeighbor? 0:1;
            points.splice(ind, 0, newPoint);

            this.updatePolygons();

        } else {
            if (this.currDefect() === undefined)
                return;

            if (this.polyStarted) {
                this.svg.on("mousemove", null);
                this.startPoint = undefined;
                this.polyStarted = !this.polyStarted;
            }
        }
    };

    createUndoDict(point: any) {
        let dict = {
            undo: () => this.delPoint(point),
            redo: () => this.addPoint(point)
        };
        return dict;
    }

    getCurrMousePoint() {
        let mouse_point = d3.mouse(this.svg[0][0]);
        let point = {
            "x": this.mouseScaleX(mouse_point[0]),
            "y": this.mouseScaleY(mouse_point[1])
        };
        return point;
    }

    mousemove() {
        if(this.startPoint !== undefined){
            this.endPoint = this.getCurrMousePoint();
            let cx = (this.startPoint.x + this.endPoint.x)/2;
            let cy = (this.startPoint.y + this.endPoint.y)/2;
            let halfWidth = Math.abs(this.startPoint.x - this.endPoint.x)/2;
            let halfHeight = Math.abs(this.startPoint.y - this.endPoint.y)/2;
            this.currDefect().points = [];
            this.drawEllipse(cx, cy, halfWidth, halfHeight);
            this.updatePolygons();
        }
    };

    savePolygons() {
        d3.json("/pic/" + this.picId + "/polygons")
            .header("Content-Type", "application/json")
            .post(JSON.stringify(this.polygons()), function(error, data) {
                // callback
            });
    };

    clearChanges() {
        this.loadPolygons();
    };

    polygonTypeName(value: any) {
        let name = this.polygonTypeToNameMapping()[value.type];
        return name === undefined ? value.type : name;
    };
}