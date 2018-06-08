import { NgModule } from '@angular/core';
import {
    MatSidenavModule,
    MatToolbarModule,
    MatCardModule,
    MatIconRegistry,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatStepperModule
} from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';

const materialModules: any[] = [
    MatSidenavModule,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatStepperModule
];

@NgModule({
    imports: materialModules,
    exports: materialModules
})
export class MaterialModule {

    constructor(matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer) {
        matIconRegistry.addSvgIcon(
            'more_vert', domSanitizer.bypassSecurityTrustResourceUrl('./assets/images/ic_more_vert_24px.svg')
        );
        matIconRegistry.addSvgIcon(
            'code', domSanitizer.bypassSecurityTrustResourceUrl('./assets/images/ic_code_24px.svg')
        );
    }

}
