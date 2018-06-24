import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MaterialModule } from './material.module';

import { FooterComponent } from './footer/footer.component';
import { MessageArchivedComponent } from './message-archived.component';
import { InfoDialogComponent } from './info-dialog.component';

import { CanDeactivateGuard } from './can-deactivate-guard.service';

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
        MessageArchivedComponent,
        InfoDialogComponent
    ],
    declarations: [
        FooterComponent,
        MessageArchivedComponent,
        InfoDialogComponent
    ],
    imports: sharedModules,
    exports: [
        sharedModules,
        FooterComponent,
        MessageArchivedComponent,
        InfoDialogComponent
    ]
})
export class SharedModule {
    public static forRoot(): ModuleWithProviders {
        return {
            ngModule: SharedModule,
            providers: [
                CanDeactivateGuard
            ]
        };
    }
}
