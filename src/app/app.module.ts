import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { AppRoutingModule } from './app-routing.module';
import { SharedModule } from './shared/shared.module';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { LocationModule } from './location/location.module';
import { NetworkModule } from './network/network.module';
import { DemandModule } from './demand/demand.module';
import { SimulationModule } from './simulation/simulation.module';

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        SharedModule,
        StoreModule.forRoot({}),
        EffectsModule.forRoot([]),
        LocationModule,
        NetworkModule,
        DemandModule,
        SimulationModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }
