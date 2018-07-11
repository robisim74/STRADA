import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { LocationService } from '../../location/location.service';
import { appConfig } from '../../app-config';

/**
 * Provides reduction factors for graph values based on weather conditions.
 */
@Injectable() export class WeatherService {

    private currentWeather: any;

    constructor(private http: HttpClient, private location: LocationService) { }

    public reset(): void {
        this.currentWeather = null;
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
     * Manages the data obtained from OpenWeatherMap.
     * @param data Weather data
     */
    public manageWeatherData(data: any): Observable<any> {
        console.log(data);
        return of(null);
    }

}
