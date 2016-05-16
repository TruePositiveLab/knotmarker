function galleryVM() {
    var self = this;
    self.imgsPerPage = ko.observable();

    self.reload = function() {
        window.location.href = "/gallery?page=1&cnt=" + self.imgsPerPage();
    };

    self.imgsPerPage.subscribe(function(newVal) {
        if (newVal != "") {
            localStorage.setItem("imgsPerPage", newVal);
        }
    });
}


var gvm = new galleryVM();
var bindGalleryVM = function() {
    var state = document.readyState;
    if (state == 'complete') {
        var cnt = localStorage.getItem("imgsPerPage") || 20;
        gvm.imgsPerPage(cnt);
        ko.applyBindings(gvm, document.getElementById('galleryVM'));
    }
};

document.addEventListener('readystatechange', bindGalleryVM, false);
