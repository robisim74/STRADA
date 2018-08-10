export type EnumValueType = string | number;

export class EnumValues {

    public static getNames(e: any): string[] {
        return Object.keys(e).filter((key: string) => isNaN(+key));
    }

    public static getValues<T extends EnumValueType>(e: any): T[] {
        return this.getNames(e).map((name: string) => e[name]) as T[];
    }

}

export function toSeconds(value: number): number {
    return value / 1000;
}

/**
 * Format time to M:SS
 * @param s Seconds
 * @returns M:SS
 */
export function formatTimeFromSeconds(s: number): string {
    return Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2);
}

/**
 * Format time to M:SS.mmm
 * @param ms Milliseconds
 * @returns M:SS.mmm
 */
export function formatTimeFromMilliseconds(ms: number): string {
    return Math.floor(ms / 1000 / 60) + ':' +
        ('0' + Math.floor((ms / 1000) % 60)).slice(-2) + '.' +
        ('00' + (ms - Math.floor(ms / 1000) * 1000)).slice(-3);
}
