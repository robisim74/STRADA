import { NgModule } from '@angular/core';

import { UiRoutingModule } from './ui-routing.module';
import { SharedModule } from '../shared/shared.module';

import { StoreModule } from "@ngrx/store";
import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';

import { UiComponent } from './ui.component';
import { WizardComponent } from './wizard/wizard.component';
import { SearchForTheAreaComponent } from './wizard/search-for-the-area/search-for-the-area.component';
import { SelectionOfTheAreaComponent } from './wizard/selection-of-the-area/selection-of-the-area.component';
import { EstimateOfDemandComponent } from './wizard/estimate-of-demand/estimate-of-demand.component';
import { ChangeOfConditionsComponent } from './wizard/change-of-conditions/change-of-conditions.component';
import { SimulationComponent } from './wizard/simulation/simulation.component';
import { StatisticsComponent } from './wizard/statistics/statistics.component';
import { MapComponent } from './map/map.component';
import { GoogleMapComponent } from './map/google-map.component';
import { WeatherComponent } from './weather/weather.component';
import { NumericComponent } from './numeric/numeric.component';
import { ChartsComponent } from './charts/charts.component';

import { WizardService } from './wizard/wizard.service';
import { SchedulerService } from './wizard/scheduler.service';
import { MapService } from './map/map.service';
import { reducers } from './models/reducers';

@NgModule({
    imports: [
        UiRoutingModule,
        SharedModule,
        StoreModule.forFeature('ui', reducers),
        OwlDateTimeModule,
        OwlNativeDateTimeModule
    ],
    declarations: [
        UiComponent,
        WizardComponent,
        SearchForTheAreaComponent,
        SelectionOfTheAreaComponent,
        EstimateOfDemandComponent,
        ChangeOfConditionsComponent,
        SimulationComponent,
        StatisticsComponent,
        MapComponent,
        GoogleMapComponent,
        WeatherComponent,
        NumericComponent,
        ChartsComponent
    ],
    providers: [
        WizardService,
        SchedulerService,
        MapService
    ]
})
export class UiModule { }
