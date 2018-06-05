import { NgModule } from '@angular/core';
import {
    MatSidenavModule,
    MatToolbarModule,
    MatCardModule
} from '@angular/material';

const materialModules: any[] = [
    MatSidenavModule,
    MatToolbarModule,
    MatCardModule
];

@NgModule({
    imports: materialModules,
    exports: materialModules
})
export class MaterialModule { }
