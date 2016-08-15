import * as ko from "knockout";

export class ViewModel {
    htmlElemName: string;

    constructor() {
    }

    static tryBind(vmType: any){
        if (document.readyState != 'complete') {
            document.addEventListener("readystatechange", () => ViewModel.bind(vmType))
        } else {
             ViewModel.bind(vmType);
        }
    }

    static bind<T extends ViewModel>( vmType: {new(): T; }) {
        if (document.readyState == 'complete') {
            let vm = new vmType();
            ko.applyBindings(vm, document.getElementById(vm.htmlElemName));
        }
    }
}
