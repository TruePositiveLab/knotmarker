import * as ko from "knockout";
import { ViewModel } from "viewmodel";

export class NavigationViewModel extends ViewModel {
    galleryUrl: KnockoutObservable<string>;
    imgsPerPageKey: string = 'imgsPerPage';
    currCategoryKey: string = 'currCategory';
    defaultImgsCnt: number = 20;
    htmlElemName: string = 'navVM';

    constructor() {
        super();
        let imgsPerPage = this.getImgsPerPageCnt();
        let currCategory = this.getCurrCategory();
        this.galleryUrl = ko.observable(`/gallery?page=1&cnt=${imgsPerPage}&cat=${currCategory}`);
    }

    getImgsPerPageCnt() {
        return localStorage.getItem(this.imgsPerPageKey) || this.defaultImgsCnt;
    }

    getCurrCategory(){
        return localStorage.getItem(this.currCategoryKey)||'';
    }
}

ViewModel.tryBind(NavigationViewModel);

