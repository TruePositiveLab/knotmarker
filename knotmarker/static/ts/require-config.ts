declare var require: any;
require.config({
    baseUrl: "/static/js/",
    paths: {
        "knockout": "external/node_modules/knockout/build/output/knockout-latest",
        "d3": "external/node_modules/d3/d3.min",
        "undomanager": "external/node_modules/undo-manager/lib/undomanager",
        "randomColor": "external/node_modules/randomcolor/randomColor",
        "nav": "nav",
        "gallery": "gallery",
        "editor": "editor"
    },
    shim: {
        'editor': ['randomColor','undomanager']
    }
});