import { NgModule } from '@angular/core';

import { StoreModule } from "@ngrx/store";

import { SimulationService } from './simulation.service';
import { ClockService } from './clock.service';
import { reducers } from './models/reducers';

@NgModule({
    imports: [
        StoreModule.forFeature('simulation', reducers)
    ],
    declarations: [],
    providers: [SimulationService, ClockService]
})
export class SimulationModule { }
