import { NgModule } from '@angular/core';

import { WeatherModule } from './weather/weather.module';

import { NetworkService } from './network.service';

@NgModule({
    imports: [WeatherModule],
    declarations: [],
    providers: [NetworkService]
})
export class NetworkModule { }
