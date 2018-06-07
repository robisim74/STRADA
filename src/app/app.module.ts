import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { SharedModule } from './shared/shared.module';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { WizardComponent } from './wizard/wizard.component';
import { SearchForTheAreaComponent } from './wizard/search-for-the-area/search-for-the-area.component';
import { SelectionOfTheAreaComponent } from './wizard/selection-of-the-area/selection-of-the-area.component';
import { SelectionOfOdPairsComponent } from './wizard/selection-of-od-pairs/selection-of-od-pairs.component';
import { ChangeOfDemandAndWeatherComponent } from './wizard/change-of-demand-and-weather/change-of-demand-and-weather.component';
import { SimulationComponent } from './wizard/simulation/simulation.component';
import { StatisticsComponent } from './wizard/statistics/statistics.component';

import { LocationService } from './location/location.service';
import { NetworkService } from './network/network.service';
import { WeatherService } from './network/weather/weather.service';
import { DemandService } from './demand/demand.service';
import { SimulationService } from './simulation/simulation.service';

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        WizardComponent,
        SearchForTheAreaComponent,
        SelectionOfTheAreaComponent,
        SelectionOfOdPairsComponent,
        ChangeOfDemandAndWeatherComponent,
        SimulationComponent,
        StatisticsComponent
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
