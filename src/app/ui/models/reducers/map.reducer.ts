import deepClone from 'mout/lang/deepClone';

import { Map } from "../ui-state";
import { MapActions, MapActionTypes } from '../actions/map.actions';

/**
 * Map state management.
 */
export interface MapState {

    map: Map;

}

export const initialMapState: MapState = {
    map: null
};

/**
 * ngrx: map Reducer.
 */
export function mapReducer(state: MapState = deepClone(initialMapState), action: MapActions): MapState {
    switch (action.type) {
        case MapActionTypes.MapChanged: {
            state.map = action.payload.map;
            return {
                ...state,
                map: deepClone(state.map)
            };
        }
        case MapActionTypes.Reset: {
            return deepClone(initialMapState);
        }
        default: {
            return state;
        }
    }
}

export const getMap: (state: MapState) => Map = (state: MapState) => state.map;
