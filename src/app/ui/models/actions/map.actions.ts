import { Action } from '@ngrx/store';

import { Map } from '../ui-state';

/**
 * ngrx: map Actions.
 */
export enum MapActionTypes {

    MapChanged = '[Map] Map Changed',
    Reset = '[Map] Reset'

}

export class MapChanged implements Action {

    public readonly type: string = MapActionTypes.MapChanged;

    constructor(public payload: { map: Map }) { }

}

export class Reset implements Action {

    public readonly type: string = MapActionTypes.Reset;

    constructor(public payload: any) { }

}

export type MapActions = MapChanged | Reset;
