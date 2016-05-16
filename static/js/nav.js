function navVM(){
    var self = this;
    self.galleryUrl = ko.observable();
}

var bindNavVM = function() {
    var state = document.readyState;
    if (state == 'complete') {
        var navvm = new navVM();
        var cnt = localStorage.getItem("imgsPerPage")||20;
        navvm.galleryUrl("/gallery?page=1&cnt=" + cnt);
        ko.applyBindings(navvm, document.getElementById('navVM'));
    }
};

document.addEventListener('readystatechange', bindNavVM, false);