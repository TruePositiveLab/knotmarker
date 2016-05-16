var width = 808,
    height = 608;
var scaleX = d3.scale.linear()
        .domain([0, width])
        .range([0, width]);

var scaleY = d3.scale.linear()
        .domain([0, height])
        .range([height, 0]);

var mouseScaleX = d3.scale.linear()
        .domain([0, width])
        .range([0, width]);

var mouseScaleY = d3.scale.linear()
        .domain([height, 0])
        .range([0, height]);

var defects = {
    darken:"Потемнение",
    knot_defect:"Сучок с дефектами",
    knot_decay:"Табачный сучок",
    knot_encased:"Несросшийся сучок",
    knot_sound:"Здоровый сучок",
    knot_pin:"Очень маленький сучок",
    crack:"Трещина",
    mechanical:"Механическое повреждение",
    pith:"Сердцевина",
    tar:"Смоляной карман",
    unknown:"Неизвестный дефект"
};

function markerVM(){
    var self = this;
    self.polygons = ko.observableArray();
    self.defects = ko.observableArray();
    self.currDefect = ko.observable();
    self.currType = ko.observable();
    self.newType = ko.observable();
    self.lineStarted = false;
    self.hasUndo = ko.observable();
    self.hasRedo = ko.observable();
    self.canSave = ko.observable();

    self.newType.subscribe(function(newVal){
        if(newVal != ""){
            self.currDefect().type = newVal;
            self.polygons(self.polygons());
        }
    });

    self.currType.subscribe(function(newVal){
        self.currDefect().type = newVal;
        self.newType("");
        self.polygons(self.polygons());
    });

    self.currDefect.subscribe(function(newVal){
        if(newVal != undefined){
            self.currType(newVal.type);
        }
    });


    self.addPoly = function(data, event){
        self.polygons.push({
            "type": "unknown",
            "stroke_color": self.getNewColor(),
            "points":[],
            "occluded": false
        });
        self.currDefect(self.polygons().slice(-1)[0]);
    };

    self.delPoly = function(){
        self.polygons.remove(self.currDefect());
        self.currDefect(self.polygons()[0]);
        self.updatePolygons();
    };

    self.getNewColor = function(){
        var newColor = randomColor({luminosity: 'dark'});
        for(var i = 0; i < self.polygons.length; i++) {
            if (newColor == self.polygons()[i].stroke_color){
                return getNewColor();
            }
        }
        return newColor;
    };

    self.drawPolygons = function(){
        svg.selectAll("polyline")
            .data(self.polygons())
            .enter()
            .append("polyline")
            .attr("points", function(d) { return d.points.map(function(d) { return [scaleX(d.x),scaleY(d.y)].join(","); }).join(" "); })
            .attr("stroke", function(d) { return d.stroke_color; })
            .attr("fill", "none")
            .attr("stroke-width", 2);

        svg.selectAll("circle")
            .data(self.polygons())
            .enter()
            .append("circle")
            .attr("cx", function(d) { return scaleX(d.points[0].x); })
            .attr("cy", function(d) { return scaleY(d.points[0].y); })
            .attr("r", mouseScaleX(10))
            .attr("stroke", function(d) { return d.stroke_color; })
            .attr("stroke-width", 2)
            .attr("fill", "transparent");

        var fontSize = mouseScaleX(20);
        svg.selectAll("text")
            .data(self.polygons())
            .enter()
            .append("text")
            .attr("x", function(d) { return scaleX(d.points[0].x); })
            .attr("y", function(d) { return scaleY(d.points[0].y) + fontSize/2.5; })
            .text( function (d) { return self.polygons().indexOf(d); })
            .attr("font-family", "sans-serif")
            .attr("font-size", fontSize)
            .style("text-anchor", "middle")
            .style("font-weight", "bold")
            .attr("fill", "black");
    };

    self.occludePolygon = function(){
        var def = self.currDefect();
        if(!def.occluded){
            def.points.push(def.points[0]);
            def.occluded = true;
            //var len = def.points.length;
            //var cx = def.points.map(p => p.x).reduce((x1, x2) => x1 + x2, 0)/len;
            //var cy = def.points.map(p => p.y).reduce((y1, y2) => y1 + y2, 0)/len;
            //var centerPoint = {"x": cx, "y": cy};

            //svg.append("circle")
            //    .attr("cx", scaleX(cx))
            //    .attr("cy", scaleY(cy))
            //    .attr("r",  mouseScaleX(300))
            //    .attr("stroke", def.stroke_color)
            //    .attr("stroke-width", 2)
            //    .attr("fill", "transparent");
            //console.log(centerPoint);

        }
        else{
             self.currDefect().occluded = false;
             self.currDefect().points.pop();
        }
        self.updatePolygons();
    };

    self.updatePolygons = function(){
        svg.selectAll("polyline")
            .data(self.polygons())
            .attr("points", function(d) { return d.points.map(function(d) { return [scaleX(d.x),scaleY(d.y)].join(","); }).join(" ");})
            .attr("stroke",function(d) { return d.stroke_color;})
            .attr("fill", "none")
            .attr("stroke-width", 2);

        svg.selectAll("circle")
            .data(self.polygons())
            .attr("cx", function(d) { return scaleX(d.points[0].x); })
            .attr("cy", function(d) { return scaleY(d.points[0].y); })
            .attr("r", mouseScaleX(10))
            .attr("stroke", function(d) { return d.stroke_color; })
            .attr("stroke-width", 2)
            .attr("fill", "transparent");

        var fontSize = mouseScaleX(20);
        svg.selectAll("text")
            .data(self.polygons())
            .attr("x", function(d) { return scaleX(d.points[0].x); })
            .attr("y", function(d) { return scaleY(d.points[0].y) + fontSize/2.5; })
            .text( function (d) { return self.polygons().indexOf(d); })
            .attr("font-family", "sans-serif")
            .attr("font-size", fontSize)
            .style("text-anchor", "middle")
            .style("font-weight", "bold")
            .attr("fill", "black");

        svg.selectAll("polyline")
        .data(self.polygons())
        .exit()
        .remove();

        svg.selectAll("circle")
        .data(self.polygons())
        .exit()
        .remove();

        svg.selectAll("text")
        .data(self.polygons())
        .exit()
        .remove();
    };

    self.addPoint = function(point){
        self.currDefect().points.push(point);
    };

    self.delPoint = function(point){
        var points = self.currDefect().points;
        for(var i = 0; i < points.length; i++){
            if(point.x == points[i].x && point.y == points[i].y){
                points.splice(i, 1);
                break;
            }
        }
    };

    self.createPoint = function(){
        var points =  self.currDefect().points;
        if(self.currDefect() == undefined)
            return;

        if(points.length == 1){
            self.lineStarted = false;
            var point = d3.mouse(this);
            point = {"x": mouseScaleX(point[0]), "y": mouseScaleY(point[1])};
            points.push(point);
        }
        else{
            self.lineStarted = !self.lineStarted;
        }

        if(self.lineStarted){
            svg.on("mousemove", self.mousemove);
            points.push({"x":0, "y":0});
        }
        else{
            svg.on("mousemove", null);
            var point = d3.mouse(this);
            point = {"x": mouseScaleX(point[0]), "y": mouseScaleY(point[1])};
            undoManager.add({
                undo: function() {
                     self.delPoint(point);
                },
                redo: function() {
                     self.addPoint(point);
                }
            });
        }

    };

    self.mousemove = function() {
        self.currDefect().points.pop();
        var point = d3.mouse(this);
        point = {"x": mouseScaleX(point[0]), "y": mouseScaleY(point[1])};
        self.addPoint(point);
        self.drawPolygons();
        self.updatePolygons();
    };

    self.onUndoManagerUpdate = function() {
        self.drawPolygons();
        self.updatePolygons();
        self.canSave( self.currDefect().points.length > 0);
        self.hasUndo(undoManager.hasUndo());
        self.hasRedo(undoManager.hasRedo());
    };

    self.savePolygons = function(){
        d3.json("/pic/" + pic_id + "/polygons")
        .header("Content-Type", "application/json")
        .post(JSON.stringify(self.polygons()), function(error, data) {
          // callback
        });
    };

    self.clearChanges = function(){
        self.loadPolygons();
    };

    self.loadPolygons = function(){
        d3.json( "/pic/" + pic_id + "/polygons",
            function(json){

                var boardRect = json.rect;
                svg =  d3.select("body")
                        .select("#svgPlace")
                        .attr("width", boardRect.w - boardRect.x)
                        .attr("height", boardRect.h - boardRect.y)
                        .on("click", self.createPoint);

                if(pic_id != ""){
                    svg.append("svg:image")
                        .attr("xlink:href", "/pic/" + pic_id + ".jpg")
                        .attr("x", -boardRect.x)
                        .attr("y", -boardRect.y)
                        .attr("width", width)
                        .attr("height", height);
                }


                self.defects(Object.keys(defects)) ;
                for(var i=0; i<json.Polygons.length; i++){
                    if(json.Polygons[i].occluded){
                        json.Polygons[i].points.push(json.Polygons[i].points[0]);
                    }
                }
                self.polygons(json.Polygons);
                self.drawPolygons();
                self.updatePolygons();
                self.currDefect(self.polygons()[0]);
                self.canSave( self.currDefect() != undefined && self.currDefect().points.length > 0);
        });
    };

    self.sendPolygons = function(){
    };
}


var undoManager, svg, evm = new markerVM();
var bindEditorVM = function () {
    var state = document.readyState;
    if (state == 'complete') {
        undoManager = new UndoManager();
        undoManager.setCallback(evm.onUndoManagerUpdate);
        evm.loadPolygons();
        ko.applyBindings(evm, document.getElementById('editorVM'));
    }
};

document.addEventListener('readystatechange', bindEditorVM, false);