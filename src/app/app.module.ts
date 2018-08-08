import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { StoreModule } from '@ngrx/store';

import { AppRoutingModule } from './app-routing.module';
import { SharedModule } from './shared/shared.module';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { TermsComponent } from './terms/terms.component';
import { LocationModule } from './location/location.module';
import { NetworkModule } from './network/network.module';
import { DemandModule } from './demand/demand.module';
import { SimulationModule } from './simulation/simulation.module';

import { loadScripts } from './utils';

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        AboutComponent,
        PrivacyComponent,
        TermsComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        SharedModule.forRoot(),
        StoreModule.forRoot({}),
        LocationModule,
        NetworkModule,
        DemandModule,
        SimulationModule
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            useFactory: loadScripts,
            deps: [],
            multi: true
        }
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
