import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CanDeactivateGuard } from '../shared/can-deactivate-guard.service';

import { UiComponent } from './ui.component';

const routes: Routes = [
    { path: '', component: UiComponent, pathMatch: 'full', canDeactivate: [CanDeactivateGuard] },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class UiRoutingModule { }
