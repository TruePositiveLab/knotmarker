import * as ko from "knockout";
import { ViewModel } from "viewmodel";

namespace ViewModels {

    class GalleryViewModel extends ViewModel {
        imgsPerPage: KnockoutObservable<number>;
        galleryUrlTempl: string =  '/gallery?page=1&cnt=';
        imgsPerPageKey: string = 'imgsPerPage';
        defaultImgsCnt: number = 20;
        htmlElemName: string = 'galleryVM';

        constructor() {
            super();
            let cnt = this.getImgsPerPageCnt();
            this.imgsPerPage = ko.observable(cnt);
            this.imgsPerPage.subscribe(newVal => this.setImgsPerPageCnt(newVal));
        }

        getImgsPerPageCnt(){
            return localStorage.getItem(this.imgsPerPageKey) || this.defaultImgsCnt;
        }

        setImgsPerPageCnt(newVal: number){
            console.log(newVal);
            if (newVal >= 20) {
                localStorage.setItem(this.imgsPerPageKey, newVal.toString());
            }
        }

        reload(){
            window.location.href = this.galleryUrlTempl + this.imgsPerPage();
        }
    }

    document.addEventListener('readystatechange', () => ViewModel.bind(GalleryViewModel), false);
}



