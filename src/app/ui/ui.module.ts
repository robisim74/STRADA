import { NgModule } from '@angular/core';

import { UiRoutingModule } from './ui-routing.module';
import { SharedModule } from '../shared/shared.module';

import { StoreModule } from "@ngrx/store";
import { EffectsModule } from "@ngrx/effects";
import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';

import { UiComponent } from './ui.component';
import { WizardComponent } from './wizard/wizard.component';
import { SearchForTheAreaComponent } from './wizard/search-for-the-area/search-for-the-area.component';
import { SelectionOfTheAreaComponent } from './wizard/selection-of-the-area/selection-of-the-area.component';
import { SelectionOfOdPairsComponent } from './wizard/selection-of-od-pairs/selection-of-od-pairs.component';
import { ChangeOfDemandAndWeatherComponent } from './wizard/change-of-demand-and-weather/change-of-demand-and-weather.component';
import { SimulationComponent } from './wizard/simulation/simulation.component';
import { StatisticsComponent } from './wizard/statistics/statistics.component';
import { MapComponent } from './map/map.component';
import { GoogleMapComponent } from './map/google-map.component';
import { WeatherComponent } from './weather/weather.component';

import { WizardService } from './wizard/wizard.service';
import { MapService } from './map/map.service';
import { reducers } from './models/reducers';

@NgModule({
    imports: [
        UiRoutingModule,
        SharedModule,
        StoreModule.forFeature('ui', reducers),
        EffectsModule.forFeature([]),
        OwlDateTimeModule,
        OwlNativeDateTimeModule
    ],
    declarations: [
        UiComponent,
        WizardComponent,
        SearchForTheAreaComponent,
        SelectionOfTheAreaComponent,
        SelectionOfOdPairsComponent,
        ChangeOfDemandAndWeatherComponent,
        SimulationComponent,
        StatisticsComponent,
        MapComponent,
        GoogleMapComponent,
        WeatherComponent
    ],
    providers: [
        WizardService,
        MapService
    ]
})
export class UiModule { }
