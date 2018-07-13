import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { LocationService } from '../../location/location.service';
import { appConfig } from '../../app-config';
import { WeatherConditions } from './weather';

/**
 * Gets the weather data from the Weather or Forecast resources
 * and provides reduction factors for graph values based on weather conditions.
 */
@Injectable() export class WeatherService {

    private weatherConditions: WeatherConditions;

    constructor(private http: HttpClient, private location: LocationService) { }

    public reset(): void {
        this.weatherConditions = null;
    }

    public getWeatherConditions(): WeatherConditions {
        return this.weatherConditions;
    }

    /**
     * Gets weather data from the Weather resource. The Forecast resource is called only if the optional parameter 'time' is evaluated.
     * @param time Optional parameter for forecasting data
     */
    public getWeatherData(time?: Date): Observable<any> {
        const url: string = time ? appConfig.apis.openWeatherMap.forecastUrl : appConfig.apis.openWeatherMap.weatherUrl;
        const options = {
            params: new HttpParams()
                .set('lat', this.location.getLatLng().lat.toString())
                .set('lon', this.location.getLatLng().lng.toString())
                .set('appid', appConfig.apis.openWeatherMap.apiKey)
        };

        return this.http.get(url, options).pipe(
            map((response: any) => response),
            catchError((error: any) => throwError('getWeatherData'))
        );
    }

    /**
     * Updates weather conditions with the data obtained from OpenWeatherMap.
     * @param data Weather data
     * @param time Optional parameter for forecasting data
     */
    public updateWeatherData(data: any, time?: Date): Observable<any> {
        if (time != null && data.list.length > 0) {
            const timezoneOffset: number = time.getTimezoneOffset() * 60 * 1000; // Timezone offset in milliseconds
            const utcTime: number = time.getTime() + timezoneOffset;

            let preDt: number = data.list[0].dt * 1000; // Converts Unix UTC in millisencods
            let forecast: any = data.list[0];
            for (let i = 1; i < data.list.length; i++) {
                const nextDt: number = data.list[i].dt * 1000;
                // Finds the closest value.
                if (nextDt >= utcTime) {
                    forecast = nextDt - utcTime < utcTime - preDt ? data.list[i] : data.list[i - 1];
                    break;
                }
                preDt = data.list[i].dt * 1000;
            }
            this.addWeatherCondition(forecast);
        } else {
            this.addWeatherCondition(data);
        }
        return of(null);
    }

    private addWeatherCondition(data: any): void {
        // Gets the icon image.
        const icon = new Image();
        if (data.weather[0]) {
            icon.src = appConfig.apis.openWeatherMap.iconUrl + '/' + data.weather[0].icon + '.png';
        }

        this.weatherConditions = {
            description: data.weather[0] ? data.weather[0].description : '-',
            icon: icon,
            visibility: data.visibility && data.visibility < 10000 ? data.visibility : null,
            rainIntensity: data.rain ? data.rain['3h'] : null,
            snowIntensity: data.snow ? data.snow['3h'] : null
        };
    }

}
