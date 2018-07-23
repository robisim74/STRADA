/**
 * Weather conditions data.
 */
export interface WeatherConditions {

    description: string;
    icon: HTMLImageElement;
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
