import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MaterialModule } from './material.module';

import { FooterComponent } from './footer/footer.component';
import { MessageArchivedComponent } from './message-archived.component';

const sharedModules: any[] = [
    CommonModule,
    RouterModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    FlexLayoutModule
];

@NgModule({
    entryComponents: [
        MessageArchivedComponent
    ],
    declarations: [
        FooterComponent,
        MessageArchivedComponent
    ],
    imports: sharedModules,
    exports: [
        sharedModules,
        FooterComponent,
        MessageArchivedComponent
    ]
})
export class SharedModule { }
