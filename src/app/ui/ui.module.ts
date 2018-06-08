import { NgModule } from '@angular/core';

import { UiRoutingModule } from './ui-routing.module';
import { SharedModule } from '../shared/shared.module';

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

import { MapService } from './map/map.service';

@NgModule({
    imports: [
        UiRoutingModule,
        SharedModule
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
        MapService
    ]
})
export class UiModule { }
