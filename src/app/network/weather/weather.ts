/**
 * Weather conditions data.
 */
export interface WeatherConditions {

    description: string;
    /**
     * The code of the icon.
     */
    icon?: string;
    /**
     * Meters.
     */
    visibility?: number;
    /**
     * Millimeters.
     */
    rainIntensity?: number;
    /**
     * Millimeters.
     */
    snowIntensity?: number;

}

export enum WeatherDescription {
    clearSky = 'clear sky',
    fewClouds = 'few clouds',
    scatteredClouds = 'scattered clouds',
    brokenClouds = 'broken clouds',
    showerRain = 'shower rain',
    rain = 'rain',
    thunderstorm = 'thunderstorm',
    snow = 'snow',
    mist = 'mist',
}
