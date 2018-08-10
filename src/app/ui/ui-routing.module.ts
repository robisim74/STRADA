import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { CanDeactivateGuard } from '../shared/can-deactivate-guard.service';

import { UiComponent } from './ui.component';

@NgModule({
    imports: [
        RouterModule.forChild([
            { path: '', component: UiComponent, pathMatch: 'full', canDeactivate: [CanDeactivateGuard] }
        ])
    ],
    exports: [RouterModule]
})
export class UiRoutingModule { }
