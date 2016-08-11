import * as ko from "knockout";

namespace ViewModels {

    class GalleryViewModel {
        imgsPerPage: KnockoutObservable<number>;
        galleryUrlTempl: string =  '/gallery?page=1&cnt=';
        imgsPerPageKey: string = 'imgsPerPage';
        defaultImgsCnt: number = 20;
        htmlElemName: string = 'galleryVM';

        constructor() {
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

        public static bind(){
            if (document.readyState == 'complete') {
                let vm = new GalleryViewModel();
                ko.applyBindings(vm, document.getElementById(vm.htmlElemName));
            }
        }
    }

    document.addEventListener('readystatechange', GalleryViewModel.bind, false);
}



