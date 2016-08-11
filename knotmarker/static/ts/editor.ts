import * as ko from "knockout";
import * as d3 from "d3";
declare var UndoManager: any;
declare var RandomColor: any;
declare var pic_id: string;

namespace ViewModels {

    class EditorViewModel {
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
        lineStarted: boolean = false;
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

        constructor() {
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

        addPoly(data: any, event: any) {
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
            this.drawPolygons();
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
                .on("click", () => this.createPoint());
    
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
            this.drawPolygons();
            this.updatePolygons();
            this.currDefect(this.polygons()[0]);
            this.canSave(this.currDefect() !== undefined && this.currDefect().points.length > 0);
        };

        updatePolygons() {
            this.svg.selectAll("polyline")
                .data(this.getPolygons())
                .attr("points", (d: any) => this.getMappedPoints(d))
                .attr("stroke", (d: any) => d.stroke_color)
                .attr("fill", "none")
                .attr("stroke-width", 2);

            this.svg.selectAll("circle")
                .data(this.getPolygons())
                .attr("cx", (d: any) => this.getCircleX(d))
                .attr("cy", (d: any) => this.getCircleY(d))
                .attr("r", this.mouseScaleX(10))
                .attr("stroke", (d: any) =>d.stroke_color)
                .attr("stroke-width", 2)
                .attr("fill", "transparent");

            this.svg.selectAll("text")
                .data(this.getPolygons())
                .attr("x", (d: any) => this.getCircleX(d))
                .attr("y", (d: any) => this.getCircleY(d, this.fontSize / 2.5))
                .text((d: any) => this.polygons().indexOf(d))
                .attr("font-family", "sans-serif")
                .attr("font-size", this.fontSize)
                .style("text-anchor", "middle")
                .style("font-weight", "bold")
                .attr("fill", "black");

            this.svg.selectAll("polyline")
                .data(this.polygons())
                .exit()
                .remove();

            this.svg.selectAll("circle")
                .data(this.polygons())
                .exit()
                .remove();

            this.svg.selectAll("text")
                .data(this.polygons())
                .exit()
                .remove();
        }

        drawPolygons() {
            this.svg.selectAll("polyline")
                .data(this.getPolygons())
                .enter()
                .append("polyline")
                .attr("points", (d: any) => this.getMappedPoints(d))
                .attr("stroke", (d: any) => d.stroke_color)
                .attr("fill", "none")
                .attr("stroke-width", 2);

            this.svg.selectAll("circle")
                .data(this.getPolygons())
                .enter()
                .append("circle")
                .attr("cx", (d: any) => this.getCircleX(d))
                .attr("cy", (d: any) => this.getCircleY(d))
                .attr("r", this.mouseScaleX(10))
                .attr("stroke", (d: any) => d.stroke_color)
                .attr("stroke-width", 2)
                .attr("fill", "transparent");

            this.svg.selectAll("text")
                .data(this.getPolygons())
                .enter()
                .append("text")
                .attr("x", (d: any) => this.getCircleX(d))
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

        getCircleX(polygon: any, offset:number = 0) {
            return this.scaleX(polygon.points[0].x) + offset;
        }

        getCircleY(polygon: any, offset:number = 0) {
            return this.scaleY(polygon.points[0].y) + offset;
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

        createPoint() {
            if (this.currDefect() === undefined)
                return;

            let points = this.currDefect().points;
            if (points.length == 1) {
                this.lineStarted = false;
                let point = this.getCurrMousePoint();
                points.push(point);
            } else {
                this.lineStarted = !this.lineStarted;
            }

            if (this.lineStarted) {
                this.svg.on("mousemove", () => this.mousemove());
                let point = this.getCurrMousePoint();
                points.push(point);
            } else {
                this.svg.on("mousemove", null);
                let point = this.getCurrMousePoint();
                this.undoManager.add(this.createUndoDict(point));
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
            this.currDefect().points.pop();
            let mouse_point = d3.mouse(this.svg[0][0]);
            let point = {
                "x": this.mouseScaleX(mouse_point[0]),
                "y": this.mouseScaleY(mouse_point[1])
            };
            this.addPoint(point);
            this.drawPolygons();
            this.updatePolygons();
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

        static bind() {
            if (document.readyState == 'complete') {
                let vm = new EditorViewModel();
                ko.applyBindings(vm, document.getElementById(vm.htmlElemName));
            }
        }
    }

    document.addEventListener('readystatechange', EditorViewModel.bind, false);
}
