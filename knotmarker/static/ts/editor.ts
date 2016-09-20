import * as ko from "knockout";
import * as d3 from "d3";
import { ViewModel } from "viewmodel";
import centroid = d3.geo.centroid;
declare var UndoManager: any;
declare var RandomColor: any;
declare var pic_id: string;
declare var user_id: string;


class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    rotate(center: Point, angle: number) {
        let oldX = this.x - center.x;
        let oldY = this.y - center.y;
        this.x = center.x + oldX*Math.cos(angle) - oldY*Math.sin(angle);
        this.y = center.y + oldX*Math.sin(angle) + oldY*Math.cos(angle);
    }

    translate(dx: number, dy: number) {
        this.x += dx;
        this.y -= dy;
    }
}

class Polygon {
    type: string;
    stroke_color: string;
    points: Array<Point>;
    center: Point;

    constructor(stroke_color: string, type: string = "unknown",
                points: Array<Point> = [], center: Point = new Point(0, 0)) {
        this.type = type;
        this.stroke_color = stroke_color;
        this.points = points;
        this.center = center;
    }

    updateCenter() {
        let x = 0;
        let y = 0;
        this.points.forEach(p => {x += p.x; y += p.y});
        this.center = new Point(x/this.points.length, y/this.points.length);
    }
}

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
    userId: string;
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
    rotationAngleStep: number = 0.05 ;

    constructor() {
        super();
        this.picId = pic_id;
        this.userId = user_id;
        this.newType.subscribe(newVal => {
            if (newVal !== "") {
                this.addNewPolygonType(newVal);
                this.currDefect().type = newVal;
                this.polygons(this.polygons());
                this.canSave(true);
            }
        });

        this.currType.subscribe(newVal => {
            if (newVal === undefined)
                return;
            this.currDefect().type = newVal;
            this.newType("");
            this.polygons(this.polygons());
            this.canSave(true);
        });

        this.currDefect.subscribe(newVal => {
            if (newVal !== undefined) {
                this.currType(newVal.type);
                this.highlightPolygon(newVal);
            } else {
                this.disablePolygonHighlight();
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

    addNewPolygonType(newVal: string){
        let types = this.polygonTypes();

        let exists = false;
        for(let i = 0; i < types.length; i++)
            if(types[i].type == newVal)
                exists = true;

        if(!exists){
            let new_type = {'readable_name': newVal,
                        'type': newVal};
            types.push(new_type);
            this.polygonTypes(types);
        }
    }

    disablePolygonHighlight(){
        this.svg
            .selectAll("g[id^='poly']")
            .remove();
        this.updatePolygons();
    }

    addPoly(createElipse: boolean = true) {
        this.polygons.push(new Polygon(this.getNewColor()));
        this.currDefect(this.polygons().slice(-1)[0]);
        if(createElipse){
            let rect = this.svg.node().getBoundingClientRect();
            let halfWidth = rect.width/30;
            this.drawEllipse(rect.width/2, this.scaleY(rect.height/2), halfWidth, halfWidth);
            this.updatePolygons()
        }
        this.canSave(true);
    };

    delPoly() {
        this.polygons.remove(this.currDefect());
        this.currDefect(this.polygons()[0]);
        if(this.polygons().length == 0)
            this.svg
                .selectAll("g[id^='poly']")
                .remove();
        this.updatePolygons();
        this.canSave(true);
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
        d3.json(`/pic/${ this.picId }/${ this.userId }/polygons`, json => this.initPolygons(json));
    }

    initPolygons(json: any) {
        let boardRect = json.rect;
        d3.selectAll("svg > *").remove();
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

        //need to replace with some json-to-ts-mapper
        let polygons: Array<Polygon> = [];
        for(let i = 0; i < json.polygons.length; i++){
            let poly = json.polygons[i];
            let center = new Point(poly.center.x, poly.center.y);
            let points: Array<Point> = [];
            for(let j = 0; j < poly.points.length; j++){
                let pt = poly.points[j];
                points.push(new Point(pt.x, pt.y));
            }
            polygons.push(new Polygon(poly.stroke_color, poly.type, points, center));
            this.addNewPolygonType(poly.type);
        }

        this.polygons(polygons);
        this.updatePolygons();
        // if(this.polygons().length > 0)
        //     this.currDefect(this.polygons()[0]);
        this.canSave(false);

        let picRow = d3.select("#picRow");
        picRow.on("keydown", () => this.onPicRowKeydown());
        this.svg.on("wheel", () => this.onPicRowWheel());
        picRow.on("click", () => this.onPicRowClick());
        picRow.node().focus();
    };

    drawEllipse(cx: number, cy: number, halfWidth: number, halfHeight: number){
        let a = halfWidth*1.4;
        let b = Math.sqrt(a*a*halfHeight*halfHeight/(a*a - halfWidth*halfWidth));

        let leftPoint = new Point(cx - a, cy);
        let rightPoint = new Point(cx + a, cy);
        let topPoint = new Point(cx, cy - b);
        let bottomPoint = new Point(cx, cy + b);
        let topLeftPoint = new Point(cx - halfWidth, cy - halfHeight);
        let topRightPoint = new Point(cx + halfWidth, cy - halfHeight);
        let bottomLeftPoint = new Point(cx - halfWidth, cy + halfHeight);
        let bottomRightPoint = new Point(cx + halfWidth, cy + halfHeight);

        let points = this.currDefect().points;
        this.currDefect().center = new Point(cx, cy);
        points.push(leftPoint);
        points.push(topLeftPoint);
        points.push(topPoint);
        points.push(topRightPoint);
        points.push(rightPoint);
        points.push(bottomRightPoint);
        points.push(bottomPoint);
        points.push(bottomLeftPoint);
    }

    polygonsOpacity(opacity: number){
        let polygons  = this.getPolygons();
        let polylines = this.svg.selectAll("polygon")
            .data(polygons);
        polylines.style("opacity", opacity);

        let currPoly = this.currDefect();
        if(currPoly !== undefined)
            this.polygonCirclesGroup(currPoly)
                .selectAll("circle")
                .data(currPoly.points)
                .style("opacity", opacity);
    }

    polygonCirclesGroup(polygon: any){
        let ind: number = this.polygons.indexOf(polygon);
        let groupId: string = "poly"+ind;
        let group = this.svg.select(`#${groupId}`);
        if(group.empty())
            group =  this.svg.append("g").attr("id", groupId);

        return group;
    }

    createPolygon(){
        this.addPoly(false);

        this.polyStarted = true;
        this.svg.on("mousemove", () => this.mousemove());
        d3.select("#picRow").on("click", () => null);
        this.startPoint = this.getCurrMousePoint();

        d3.event.stopPropagation();
    }

    updatePolygons() {
        let polygons  = this.getPolygons();
        let polylines = this.svg.selectAll("polygon")
            .data(polygons);

        polylines.enter()
            .append("polygon")
            .call((l: any) => this.onPolyline(l));
        polylines.call((l: any) => this.onPolyline(l));
        polylines.call((x: any) => this.onClear(x));
    }

    onClear(fig: any) {
        fig.exit().remove();
    }

    updateCircles(polygon: any) {
        //we select group which contains points(circles) of current polygon
        let group = this.polygonCirclesGroup(polygon);

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
            polygon.points[i].translate(d3.event.dx, d3.event.dy);
        }
        polygon.center.translate(d3.event.dx, d3.event.dy);
        this.updatePolygons();
        this.canSave(true);
    }

    onPicRowKeydown(){
        if(this.currDefect() === undefined)
            return;
        if(d3.event.key == "Escape" && confirm('Удалить текущий полигон?'))
        {
            this.delPoly();
            this.svg.on("mousemove", null);
            this.startPoint = undefined;
            this.polyStarted = !this.polyStarted;
        }

        if(d3.event.key == "ArrowUp"){
            this.rotateCurrDefect(-this.rotationAngleStep);
            d3.event.preventDefault();
        }

        if(d3.event.key == "ArrowDown"){
            this.rotateCurrDefect(this.rotationAngleStep);
            d3.event.preventDefault();
        }
    }

    onPicRowWheel() {
        if(this.currDefect() === undefined)
            return;
        let angle = d3.event.deltaY < 0 ? this.rotationAngleStep : -this.rotationAngleStep;
        this.rotateCurrDefect(angle);
        d3.event.preventDefault();
        d3.event.stopPropagation();
    }

    onPicRowClick() {
        if(!d3.event.defaultPrevented){
            this.currDefect(undefined);
            d3.event.stopPropagation();
        }
    }

    nextPage() {
        if(this.canSave() && confirm("Сохранить изменения?")){
            this.savePolygons();
        }
        return true;
    }

    newPolyAngle: number = 0;
    rotateCurrDefect(angle: number) {
        if(this.currDefect === undefined)
            return;
        if (this.polyStarted) {
            this.newPolyAngle += angle;
        }
        let poly = this.currDefect();
        poly.points.forEach((x: Point) => x.rotate(poly.center, angle));
        this.updatePolygons();
        this.canSave(true);
    }

    onCircleMove(circle: any){
        circle.x += d3.event.dx;
        circle.y -= d3.event.dy;
        this.currDefect().updateCenter();
        this.updatePolygons();
        this.canSave(true);
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
        if (d3.event.shiftKey && this.currDefect().points.length > 3) {
            let poly = this.currDefect();
            let ind = poly.points.indexOf(circle);
            poly.updateCenter();
            poly.points.splice(ind, 1);
            this.updatePolygons();
            this.canSave(true);
            d3.event.stopPropagation();
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
            let leftInd = ind - 1 >= 0 ? ind - 1 : points.length - 1;
            let rightInd = ind + 1 <= points.length - 1 ? ind + 1 : 0;

            let leftNeighbor = this.getDistance(newPoint, points[leftInd]);
            let rightNeighbor = this.getDistance(newPoint, points[rightInd]);

            ind += rightNeighbor > leftNeighbor? 0:1;
            points.splice(ind, 0, newPoint);
            this.currDefect().updateCenter();
            this.updatePolygons();
            d3.event.stopPropagation();
            d3.select("#picRow").on("click", () => this.onPicRowClick());
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
        return new Point(this.mouseScaleX(mouse_point[0]), this.mouseScaleY(mouse_point[1]));
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
            if(this.newPolyAngle != 0){
                let tmp = this.newPolyAngle;
                this.newPolyAngle = 0;
                this.rotateCurrDefect(tmp);
            }
            this.updatePolygons();
        }
    };

    savePolygons() {
        d3.json(`/pic/${ this.picId }/${ this.userId }/polygons`)
            .header("Content-Type", "application/json")
            .post(JSON.stringify(this.polygons()), function(error, data) {
                // callback
            });
        this.canSave(false);
    };

    clearChanges() {
        this.loadPolygons();
    };

    polygonTypeName(value: any) {
        let name = this.polygonTypeToNameMapping()[value.type];
        return name === undefined ? value.type : name;
    };
}