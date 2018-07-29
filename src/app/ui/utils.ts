export type EnumValueType = string | number;

export class EnumValues {

    public static getNames(e: any): string[] {
        return Object.keys(e).filter((key: string) => isNaN(+key));
    }

    public static getValues<T extends EnumValueType>(e: any): T[] {
        return this.getNames(e).map((name: string) => e[name]) as T[];
    }

}

export function round(value: number, decimals?: number): number {
    const digits = decimals ? Math.pow(10, decimals) : 1;
    return Math.round(value * digits) / digits;
}
