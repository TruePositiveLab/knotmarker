import * as ko from "knockout";

namespace ViewModels {

    class NavigationViewModel {
        galleryUrl: KnockoutObservable<string>;
        galleryUrlTempl: string = '/gallery?page=1&cnt=';
        imgsPerPageKey: string = 'imgsPerPage';
        defaultImgsCnt: number = 20;
        htmlElemName: string = 'navVM';

        constructor() {
            let imgsPerPage = this.getImgsPerPageCnt();
            this.galleryUrl = ko.observable(this.galleryUrlTempl + imgsPerPage);
        }

        getImgsPerPageCnt() {
            return localStorage.getItem(this.imgsPerPageKey) || this.defaultImgsCnt;
        }

        static bind() {
            if (document.readyState == 'complete') {
                let vm = new NavigationViewModel();
                ko.applyBindings(vm, document.getElementById(vm.htmlElemName));
            }
        }
    }

    document.addEventListener('readystatechange', NavigationViewModel.bind, false);
}
