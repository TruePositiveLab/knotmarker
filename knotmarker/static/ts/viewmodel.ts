import * as ko from "knockout";
export class ViewModel {
    htmlElemName: string;

    constructor() {
    }

    static bind<T extends ViewModel>( vmType: {new(): T; }) {
        if (document.readyState == 'complete') {
            let vm = new vmType();
            ko.applyBindings(vm, document.getElementById(vm.htmlElemName));
        }
    }
}
