export type EnumValueType = string | number;

export class EnumValues {

    public static getNames(e: any): string[] {
        return Object.keys(e).filter((key: string) => isNaN(+key));
    }

    public static getValues<T extends EnumValueType>(e: any): T[] {
        return this.getNames(e).map((name: string) => e[name]) as T[];
    }

}
