import * as ko from "knockout";
import { ViewModel } from "viewmodel";

namespace ViewModels {

    class NavigationViewModel extends ViewModel {
        galleryUrl: KnockoutObservable<string>;
        galleryUrlTempl: string = '/gallery?page=1&cnt=';
        imgsPerPageKey: string = 'imgsPerPage';
        defaultImgsCnt: number = 20;
        htmlElemName: string = 'navVM';

        constructor() {
            super();
            let imgsPerPage = this.getImgsPerPageCnt();
            this.galleryUrl = ko.observable(this.galleryUrlTempl + imgsPerPage);
        }

        getImgsPerPageCnt() {
            return localStorage.getItem(this.imgsPerPageKey) || this.defaultImgsCnt;
        }
    }

    document.addEventListener('readystatechange', () => ViewModel.bind(NavigationViewModel), false);
}
