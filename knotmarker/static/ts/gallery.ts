import * as ko from "knockout";
import { ViewModel } from "viewmodel";

export class GalleryViewModel extends ViewModel {
    imgsPerPage: KnockoutObservable<number>;
    currCategory: KnockoutObservable<string>;
    imgsPerPageKey: string = 'imgsPerPage';
    currCategoryKey: string = 'currCategory';
    defaultImgsCnt: number = 20;
    htmlElemName: string = 'galleryVM';

    constructor() {
        super();
        let cnt = this.getImgsPerPageCnt();
        this.imgsPerPage = ko.observable(cnt);
        this.currCategory = ko.observable(this.getCurrCategory());
        this.imgsPerPage.subscribe(newVal => this.setImgsPerPageCnt(newVal));
        this.currCategory.subscribe(newVal => this.setCurrCategory(newVal));
    }

    getImgsPerPageCnt(){
        return localStorage.getItem(this.imgsPerPageKey) || this.defaultImgsCnt;
    }

    setImgsPerPageCnt(newVal: number){
        if (newVal >= 20) {
            localStorage.setItem(this.imgsPerPageKey, newVal.toString());
        }
    }

    setCurrCategory(newVal: string){
        localStorage.setItem(this.currCategoryKey, newVal);
    }

    getCurrCategory(){
        return localStorage.getItem(this.currCategoryKey)||'';
    }

    reload(){

        window.location.href = `/gallery?page=1&cnt=${this.imgsPerPage()}&cat=${this.currCategory()}`;
    }
}

ViewModel.tryBind(GalleryViewModel);




