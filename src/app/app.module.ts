import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { SharedModule } from './shared/shared.module';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { UiComponent } from './ui/ui.component';
import { WizardComponent } from './ui/wizard/wizard.component';
import { SearchForTheAreaComponent } from './ui/wizard/search-for-the-area/search-for-the-area.component';
import { SelectionOfTheAreaComponent } from './ui/wizard/selection-of-the-area/selection-of-the-area.component';
import { SelectionOfOdPairsComponent } from './ui/wizard/selection-of-od-pairs/selection-of-od-pairs.component';
import { ChangeOfDemandAndWeatherComponent } from './ui/wizard/change-of-demand-and-weather/change-of-demand-and-weather.component';
import { SimulationComponent } from './ui/wizard/simulation/simulation.component';
import { StatisticsComponent } from './ui/wizard/statistics/statistics.component';
import { MapComponent } from './ui/map/map.component';
import { WeatherComponent } from './ui/weather/weather.component';

import { LocationService } from './location/location.service';
import { NetworkService } from './network/network.service';
import { WeatherService } from './network/weather/weather.service';
import { DemandService } from './demand/demand.service';
import { SimulationService } from './simulation/simulation.service';


@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        UiComponent,
        WizardComponent,
        SearchForTheAreaComponent,
        SelectionOfTheAreaComponent,
        SelectionOfOdPairsComponent,
        ChangeOfDemandAndWeatherComponent,
        SimulationComponent,
        StatisticsComponent,
        MapComponent,
        WeatherComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        SharedModule
    ],
    providers: [
        LocationService,
        NetworkService,
        WeatherService,
        DemandService,
        SimulationService
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
